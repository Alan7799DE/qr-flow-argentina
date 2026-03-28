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
    if (!MERCADOPAGO_ACCESS_TOKEN) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN is not configured');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration missing');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
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

    // Check if there's already a pending subscription created in the last hour — reuse it
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: existingPending } = await supabase
      .from('subscriptions')
      .select('id, mercadopago_preapproval_id')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .gte('created_at', oneHourAgo)
      .maybeSingle();

    if (existingPending?.mercadopago_preapproval_id) {
      // Fetch the existing preapproval from MP to get the init_point
      try {
        const mpCheck = await fetch(
          `https://api.mercadopago.com/preapproval/${existingPending.mercadopago_preapproval_id}`,
          { headers: { 'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}` } }
        );
        if (mpCheck.ok) {
          const mpData = await mpCheck.json();
          if (mpData.init_point && mpData.status === 'pending') {
            console.log(`Reusing existing pending subscription ${existingPending.id} with preapproval ${existingPending.mercadopago_preapproval_id}`);
            return new Response(
              JSON.stringify({ success: true, init_point: mpData.init_point }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      } catch (e) {
        console.error('Error checking existing preapproval, will create new one:', e);
      }
    }

    // Get user profile for email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('user_id', user.id)
      .single();

    const backUrl = req.headers.get('origin') || 'https://qrapido.io';

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

    // Create or update a pending subscription record so we can reconcile later
    const { error: upsertError } = await supabase.rpc('upsert_subscription', {
      _user_id: user.id,
      _plan_id: plan.id,
      _status: 'pending',
      _mercadopago_preapproval_id: mpData.id,
      _mercadopago_subscription_id: mpData.id,
      _current_period_start: new Date().toISOString(),
      _current_period_end: null as any,
      _grace_period_ends_at: null as any,
    });

    if (upsertError) {
      console.error('Error creating pending subscription:', upsertError);
      // Non-fatal: the user can still proceed to pay, webhook will create the record
    } else {
      console.log(`Created pending subscription for user ${user.id} with preapproval ${mpData.id}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        init_point: mpData.init_point,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in create-subscription:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return new Response(
      JSON.stringify({ error: 'Ocurrió un error al procesar tu solicitud. Por favor intentá nuevamente.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
