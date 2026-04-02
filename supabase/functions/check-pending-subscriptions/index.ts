import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { verifyCronAuth } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const authHeader = req.headers.get('Authorization');
    const bearerToken = authHeader?.replace('Bearer ', '');

    if (!verifyCronAuth(bearerToken)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration missing');
    }
    if (!MERCADOPAGO_ACCESS_TOKEN) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN is not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find pending subscriptions older than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: pendingSubs, error: fetchError } = await supabase
      .from('subscriptions')
      .select('id, user_id, plan_id, mercadopago_preapproval_id, created_at')
      .eq('status', 'pending')
      .lt('created_at', oneHourAgo);

    if (fetchError) {
      console.error('Error fetching pending subscriptions:', fetchError);
      throw fetchError;
    }

    if (!pendingSubs || pendingSubs.length === 0) {
      console.log('No pending subscriptions to check');
      return new Response(
        JSON.stringify({ success: true, checked: 0, activated: 0, cancelled: 0, expired: 0, still_pending: 0, processing_time_ms: Date.now() - startTime }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${pendingSubs.length} pending subscriptions to check`);

    let activated = 0;
    let cancelled = 0;
    let expired = 0;
    let stillPending = 0;
    const PENDING_EXPIRATION_MS = 48 * 60 * 60 * 1000; // 48 hours

    for (const sub of pendingSubs) {
      if (!sub.mercadopago_preapproval_id) {
        console.log(`Subscription ${sub.id} has no preapproval_id, skipping`);
        stillPending++;
        continue;
      }

      try {
        const mpResponse = await fetch(
          `https://api.mercadopago.com/preapproval/${sub.mercadopago_preapproval_id}`,
          { headers: { 'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}` } }
        );

        if (!mpResponse.ok) {
          if (mpResponse.status === 404) {
            console.log(`Preapproval ${sub.mercadopago_preapproval_id} not found in MP, skipping`);
            stillPending++;
          } else {
            console.error(`MP API error for ${sub.mercadopago_preapproval_id}: status=${mpResponse.status}`);
            stillPending++;
          }
          continue;
        }

        const preapproval = await mpResponse.json();
        const mpStatus = preapproval.status;

        console.log(`Preapproval ${sub.mercadopago_preapproval_id}: MP status=${mpStatus}`);

        if (mpStatus === 'authorized') {
          // Activate the subscription — same logic as webhook
          const now = new Date().toISOString();
          const periodEnd = new Date();
          periodEnd.setMonth(periodEnd.getMonth() + 1);

          // Read grace period from config
          const { data: appConfig } = await supabase
            .from('app_config')
            .select('grace_period_hours')
            .eq('id', 1)
            .single();

          const { error: upsertError } = await supabase.rpc('upsert_subscription', {
            _user_id: sub.user_id,
            _plan_id: sub.plan_id,
            _status: 'active',
            _mercadopago_preapproval_id: sub.mercadopago_preapproval_id,
            _mercadopago_subscription_id: preapproval.id,
            _current_period_start: now,
            _current_period_end: periodEnd.toISOString(),
            _grace_period_ends_at: null as any,
          });

          if (upsertError) {
            console.error(`Error activating subscription ${sub.id}:`, upsertError);
            continue;
          }

          // Activate user's QR codes
          const { error: qrError } = await supabase
            .from('qr_codes')
            .update({ status: 'active', updated_at: now })
            .eq('user_id', sub.user_id)
            .is('deleted_at', null)
            .in('status', ['paused', 'trial_active', 'expired']);

          if (qrError) {
            console.error(`Error activating QR codes for user ${sub.user_id}:`, qrError);
          }

          // Clear trial flags
          await supabase
            .from('profiles')
            .update({
              trial_expires_at: null,
              trial_notice_at: null,
              trial_notice_sent: true,
              trial_notice_48h_at: null,
              trial_notice_48h_sent: true,
            } as any)
            .eq('user_id', sub.user_id);

          console.log(`Subscription ${sub.id} activated via reconciliation (preapproval=${sub.mercadopago_preapproval_id}, user=${sub.user_id})`);
          activated++;

        } else if (mpStatus === 'cancelled') {
          await supabase
            .from('subscriptions')
            .update({ status: 'cancelled', updated_at: new Date().toISOString() })
            .eq('id', sub.id);

          console.log(`Subscription ${sub.id} marked as cancelled (preapproval=${sub.mercadopago_preapproval_id})`);
          cancelled++;

        } else if (mpStatus === 'paused') {
          const { data: appConfig } = await supabase
            .from('app_config')
            .select('grace_period_hours')
            .eq('id', 1)
            .single();
          const gracePeriodHours = appConfig?.grace_period_hours ?? 24;
          const gracePeriodEnd = new Date();
          gracePeriodEnd.setHours(gracePeriodEnd.getHours() + gracePeriodHours);

          await supabase.rpc('upsert_subscription', {
            _user_id: sub.user_id,
            _plan_id: sub.plan_id,
            _status: 'paused',
            _mercadopago_preapproval_id: sub.mercadopago_preapproval_id,
            _mercadopago_subscription_id: preapproval.id,
            _current_period_start: null as any,
            _current_period_end: null as any,
            _grace_period_ends_at: gracePeriodEnd.toISOString(),
          });

          console.log(`Subscription ${sub.id} marked as paused (preapproval=${sub.mercadopago_preapproval_id})`);
          cancelled++; // count as resolved

        } else {
          // pending or unknown in MP
          const ageMs = Date.now() - new Date(sub.created_at).getTime();
          if (ageMs > PENDING_EXPIRATION_MS) {
            // Older than 48h and still pending in MP — user never paid, delete the record
            const { error: deleteError } = await supabase
              .from('subscriptions')
              .delete()
              .eq('id', sub.id);

            if (deleteError) {
              console.error(`Error deleting expired pending subscription ${sub.id}:`, deleteError);
              stillPending++;
            } else {
              console.log(`Subscription ${sub.id} deleted — pending for ${Math.round(ageMs / 3600000)}h, user never paid (preapproval=${sub.mercadopago_preapproval_id}, user=${sub.user_id})`);
              expired++;
            }
          } else {
            console.log(`Subscription ${sub.id} still pending in MP (status=${mpStatus}, age=${Math.round(ageMs / 3600000)}h), will retry`);
            stillPending++;
          }
        }

      } catch (mpError) {
        console.error(`Error checking preapproval ${sub.mercadopago_preapproval_id}:`, {
          message: mpError instanceof Error ? mpError.message : 'Unknown error',
          stack: mpError instanceof Error ? mpError.stack : undefined,
        });
        stillPending++;
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(`Reconciliation complete: checked=${pendingSubs.length}, activated=${activated}, cancelled=${cancelled}, still_pending=${stillPending}, time=${processingTime}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        checked: pendingSubs.length,
        activated,
        cancelled,
        still_pending: stillPending,
        processing_time_ms: processingTime,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error in check-pending-subscriptions:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
