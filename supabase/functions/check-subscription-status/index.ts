import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!MERCADOPAGO_ACCESS_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Verify user token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's pending subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .maybeSingle();

    if (subError) {
      console.error('Subscription fetch error:', subError);
      return new Response(
        JSON.stringify({ error: 'Error fetching subscription' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!subscription) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          status: 'no_pending',
          message: 'No hay suscripción pendiente' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const preapprovalId = subscription.mercadopago_preapproval_id;
    if (!preapprovalId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No se encontró el ID de preapproval' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch status from Mercado Pago
    console.log(`Checking MP preapproval status for: ${preapprovalId}`);
    
    const mpResponse = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
      headers: {
        'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
      },
    });

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      console.error('MP API error:', errorText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Error al consultar Mercado Pago' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const preapproval = await mpResponse.json();
    console.log('MP preapproval status:', JSON.stringify(preapproval));

    const mpStatus = preapproval.status;
    let newStatus = 'pending';
    
    if (mpStatus === 'authorized') {
      newStatus = 'active';
    } else if (mpStatus === 'cancelled' || mpStatus === 'paused') {
      newStatus = 'cancelled';
    }

    // Update subscription if status changed
    if (newStatus !== 'pending') {
      const now = new Date().toISOString();
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      const updateData: Record<string, unknown> = {
        status: newStatus,
        mercadopago_subscription_id: preapproval.id,
        updated_at: now,
      };

      if (newStatus === 'active') {
        updateData.current_period_start = now;
        updateData.current_period_end = periodEnd.toISOString();

        // Activate all user's QR codes
        console.log(`Activating QR codes for user ${user.id}`);
        const { error: qrError } = await supabase
          .from('qr_codes')
          .update({
            status: 'active',
            trial_expires_at: null,
            trial_notice_at: null,
            trial_notice_sent: false,
            updated_at: now,
          })
          .eq('user_id', user.id);

        if (qrError) {
          console.error('Error activating QR codes:', qrError);
        }
      }

      const { error: updateError } = await supabase
        .from('subscriptions')
        .update(updateData)
        .eq('id', subscription.id);

      if (updateError) {
        console.error('Error updating subscription:', updateError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        previous_status: 'pending',
        current_status: newStatus,
        mp_status: mpStatus,
        message: newStatus === 'active' 
          ? '¡Suscripción activada!' 
          : newStatus === 'cancelled'
            ? 'La suscripción fue cancelada'
            : 'El pago aún está pendiente'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in check-subscription-status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
