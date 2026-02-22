import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Cancel a preapproval in Mercado Pago
async function cancelMPPreapproval(preapprovalId: string, accessToken: string): Promise<boolean> {
  try {
    console.log(`Cancelling MP preapproval: ${preapprovalId}`);
    const response = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'cancelled' }),
    });
    
    const data = await response.json();
    console.log(`MP cancel response for ${preapprovalId}:`, JSON.stringify(data));
    
    return response.ok;
  } catch (error) {
    console.error(`Error cancelling MP preapproval ${preapprovalId}:`, error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!MERCADOPAGO_ACCESS_TOKEN) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN is not configured');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration missing');
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

    const { plan_id } = await req.json();
    if (!plan_id) {
      return new Response(
        JSON.stringify({ error: 'plan_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get plan details
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', plan_id)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      console.error('Plan error:', planError);
      return new Response(
        JSON.stringify({ error: 'Plan not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for existing subscription and cancel pending preapproval if exists
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('id, status, mercadopago_preapproval_id')
      .eq('user_id', user.id)
      .maybeSingle();

    // If there's a pending subscription with a preapproval, cancel it in MP first
    if (existingSub?.status === 'pending' && existingSub?.mercadopago_preapproval_id) {
      console.log(`User ${user.id} has pending subscription, cancelling old preapproval...`);
      await cancelMPPreapproval(existingSub.mercadopago_preapproval_id, MERCADOPAGO_ACCESS_TOKEN);
    }

    // Get user profile for email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('user_id', user.id)
      .single();

    const backUrl = req.headers.get('origin') || 'https://creatuqr.lovable.app';

    // Create Mercado Pago preapproval (subscription)
    const preapprovalPayload = {
      reason: `QRapido - Plan ${plan.name}`,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: plan.price_ars,
        currency_id: 'ARS',
      },
      payer_email: profile?.email || user.email,
      back_url: `${backUrl}/dashboard/billing`,
      external_reference: JSON.stringify({
        user_id: user.id,
        plan_id: plan.id,
      }),
    };

    console.log('Creating MP preapproval:', JSON.stringify(preapprovalPayload));

    const mpResponse = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preapprovalPayload),
    });

    const mpData = await mpResponse.json();
    console.log('MP response:', JSON.stringify(mpData));

    if (!mpResponse.ok) {
      console.error('Mercado Pago error:', mpData);
      return new Response(
        JSON.stringify({ error: 'No se pudo crear la suscripción. Por favor intentá nuevamente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create or update subscription record with pending status
    if (existingSub) {
      await supabase
        .from('subscriptions')
        .update({
          plan_id: plan.id,
          status: 'pending',
          mercadopago_preapproval_id: mpData.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSub.id);
    } else {
      await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          plan_id: plan.id,
          status: 'pending',
          mercadopago_preapproval_id: mpData.id,
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        init_point: mpData.init_point,
        preapproval_id: mpData.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in create-subscription:', error);
    // Return generic error message to client, keep details server-side only
    return new Response(
      JSON.stringify({ error: 'Ocurrió un error al procesar tu solicitud. Por favor intentá nuevamente.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
