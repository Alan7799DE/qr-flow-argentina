import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !MERCADOPAGO_ACCESS_TOKEN) {
    console.error('Missing environment variables');
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = await req.json();
    console.log('Webhook received:', JSON.stringify(body));

    // Log the webhook for debugging
    await supabase.from('webhook_logs').insert({
      provider: 'mercadopago',
      event_type: body.type || body.action || 'unknown',
      payload: body,
      processed: false,
    });

    // Handle different webhook types
    const { type, data } = body;

    if (type === 'subscription_preapproval' || type === 'subscription_authorized_payment') {
      // Get the preapproval details from MP
      const preapprovalId = data?.id;
      
      if (!preapprovalId) {
        console.log('No preapproval ID in webhook');
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Fetch preapproval details from Mercado Pago
      const mpResponse = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
        headers: {
          'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
        },
      });

      if (!mpResponse.ok) {
        console.error('Failed to fetch preapproval:', await mpResponse.text());
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const preapproval = await mpResponse.json();
      console.log('Preapproval details:', JSON.stringify(preapproval));

      // Parse external reference to get user_id and plan_id
      let externalRef;
      try {
        externalRef = JSON.parse(preapproval.external_reference || '{}');
      } catch {
        console.error('Failed to parse external_reference');
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { user_id, plan_id } = externalRef;
      if (!user_id || !plan_id) {
        console.log('Missing user_id or plan_id in external_reference');
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Map MP status to our status
      const mpStatus = preapproval.status;
      let subscriptionStatus = 'pending';
      
      if (mpStatus === 'authorized') {
        subscriptionStatus = 'active';
      } else if (mpStatus === 'cancelled') {
        subscriptionStatus = 'cancelled';
      } else if (mpStatus === 'paused') {
        subscriptionStatus = 'cancelled';
      }

      console.log(`Updating subscription for user ${user_id} to status ${subscriptionStatus}`);

      // Update subscription
      const { data: existingSub, error: fetchError } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', user_id)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching subscription:', fetchError);
      }

      const now = new Date().toISOString();
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      if (existingSub) {
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            plan_id,
            status: subscriptionStatus,
            mercadopago_preapproval_id: preapprovalId,
            mercadopago_subscription_id: preapproval.id,
            current_period_start: subscriptionStatus === 'active' ? now : null,
            current_period_end: subscriptionStatus === 'active' ? periodEnd.toISOString() : null,
            updated_at: now,
          })
          .eq('id', existingSub.id);

        if (updateError) {
          console.error('Error updating subscription:', updateError);
        }
      } else {
        const { error: insertError } = await supabase
          .from('subscriptions')
          .insert({
            user_id,
            plan_id,
            status: subscriptionStatus,
            mercadopago_preapproval_id: preapprovalId,
            mercadopago_subscription_id: preapproval.id,
            current_period_start: subscriptionStatus === 'active' ? now : null,
            current_period_end: subscriptionStatus === 'active' ? periodEnd.toISOString() : null,
          });

        if (insertError) {
          console.error('Error inserting subscription:', insertError);
        }
      }

      // If subscription is now active, activate all user's QR codes
      if (subscriptionStatus === 'active') {
        console.log(`Activating all QR codes for user ${user_id}`);
        
        const { error: qrError } = await supabase
          .from('qr_codes')
          .update({
            status: 'active',
            trial_expires_at: null,
            trial_notice_at: null,
            trial_notice_sent: false,
            updated_at: now,
          })
          .eq('user_id', user_id);

        if (qrError) {
          console.error('Error activating QR codes:', qrError);
        } else {
          console.log('QR codes activated successfully');
        }
      }

      // Mark webhook as processed
      await supabase
        .from('webhook_logs')
        .update({ processed: true })
        .eq('payload->>id', body.id);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
