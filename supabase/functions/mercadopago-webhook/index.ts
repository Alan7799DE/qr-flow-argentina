import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Verify Mercado Pago webhook signature
async function verifyMercadoPagoSignature(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string,
  webhookSecret: string
): Promise<boolean> {
  if (!xSignature || !xRequestId) {
    console.error('Missing x-signature or x-request-id headers');
    return false;
  }

  try {
    const normalizedSecret = webhookSecret.trim();

    // Parse the x-signature header: ts=xxx,v1=xxx
    const signatureParts: Record<string, string> = {};
    const parts = xSignature.split(',');
    
    for (const part of parts) {
      // Split only on the first '=' (defensive: values could contain '=' in other formats)
      const match = part.trim().match(/^([^=]+)=(.+)$/);
      if (!match) continue;
      const [, key, value] = match;
      signatureParts[key.trim()] = value.trim();
    }

    const ts = signatureParts['ts'];
    const v1 = signatureParts['v1'];

    if (!ts || !v1) {
      console.error('Invalid x-signature format, missing ts or v1');
      return false;
    }

    // Build the manifest string as per Mercado Pago docs
    // Template: id:[data.id];request-id:[x-request-id];ts:[ts];
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

    // Calculate HMAC-SHA256
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(normalizedSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(manifest)
    );

    // Convert to hex string
    const hashArray = Array.from(new Uint8Array(signature));
    const calculatedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Compare signatures
    const isValid = calculatedSignature.toLowerCase() === v1.toLowerCase();
    
    if (!isValid) {
      console.error('Signature mismatch', {
        calculated: calculatedSignature,
        received: v1,
        manifest: manifest
      });
    }

    return isValid;
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
  const MERCADOPAGO_WEBHOOK_SECRET = Deno.env.get('MERCADOPAGO_WEBHOOK_SECRET');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !MERCADOPAGO_ACCESS_TOKEN) {
    console.error('Missing environment variables');
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!MERCADOPAGO_WEBHOOK_SECRET) {
    console.error('Missing MERCADOPAGO_WEBHOOK_SECRET');
    return new Response(
      JSON.stringify({ error: 'Webhook secret not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Get headers for signature verification
    const xSignature = req.headers.get('x-signature');
    const xRequestId = req.headers.get('x-request-id');

    // Parse URL to get query params (MP may send data.id in query)
    const url = new URL(req.url);
    const queryDataId = url.searchParams.get('data.id') || url.searchParams.get('id');

    const body = await req.json();
    
    const startTime = Date.now();
    
    // Log webhook receipt (no sensitive headers)
    console.log('Webhook received:', { type: body.type, action: body.action, dataId: body.data?.id, hasSignature: !!xSignature, hasRequestId: !!xRequestId });

    // Get the data.id - priority: query param > body.data.id
    const dataId = queryDataId || body.data?.id?.toString() || '';
    
    console.log('Using dataId for signature:', dataId);

    // Verify the webhook signature
    const isValidSignature = await verifyMercadoPagoSignature(
      xSignature,
      xRequestId,
      dataId,
      MERCADOPAGO_WEBHOOK_SECRET
    );

    if (!isValidSignature) {
      console.error('Signature verification: failed', { dataId, queryDataId, bodyDataId: body.data?.id });
      
      // Log failed verification attempt
      await supabase.from('webhook_logs').insert({
        provider: 'mercadopago',
        event_type: 'signature_verification_failed',
        payload: { 
          type: body.type,
          data_id: dataId,
          query_data_id: queryDataId,
          body_data_id: body.data?.id,
          has_signature: !!xSignature,
          has_request_id: !!xRequestId
        },
        processed: false,
        error_message: 'Invalid or missing webhook signature'
      });

      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Signature verification: passed');

    // Handle different webhook types
    const { type, data } = body;
    const mpDataId = data?.id?.toString() || '';
    const eventType = type || body.action || 'unknown';

    // === IDEMPOTENCY CHECK ===
    // Check if this exact webhook was already processed successfully
    if (mpDataId) {
      const { data: existingProcessed } = await supabase
        .from('webhook_logs')
        .select('id, processed_at')
        .eq('mp_data_id', mpDataId)
        .eq('event_type', eventType)
        .eq('processed', true)
        .maybeSingle();

      if (existingProcessed) {
        console.log(`Webhook already processed: mp_data_id=${mpDataId}, event_type=${eventType}, processed_at=${existingProcessed.processed_at}`);
        return new Response(
          JSON.stringify({ received: true, message: 'Webhook already processed' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Log the webhook for debugging (unprocessed)
    const { data: webhookLog } = await supabase.from('webhook_logs').insert({
      provider: 'mercadopago',
      event_type: eventType,
      mp_data_id: mpDataId || null,
      payload: body,
      processed: false,
    }).select('id').single();

    const webhookLogId = webhookLog?.id;

    // Purge old webhook logs - keep only the latest 300
    const { count: webhookCount } = await supabase
      .from('webhook_logs')
      .select('*', { count: 'exact', head: true });

    if (webhookCount && webhookCount > 300) {
      const { data: oldLogs } = await supabase
        .from('webhook_logs')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(webhookCount - 300);

      if (oldLogs && oldLogs.length > 0) {
        const idsToDelete = oldLogs.map((log: any) => log.id);
        await supabase
          .from('webhook_logs')
          .delete()
          .in('id', idsToDelete);
        console.log(`Purged ${idsToDelete.length} old webhook logs`);
      }
    }

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
      let mpResponse: Response;
      try {
        mpResponse = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
          headers: {
            'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
          },
        });
      } catch (networkError) {
        console.error(`Network error fetching preapproval ${preapprovalId}:`, networkError);
        // Return 500 so MP retries the webhook
        return new Response(
          JSON.stringify({ error: 'Failed to reach Mercado Pago API' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!mpResponse.ok) {
        const errorBody = await mpResponse.text();
        console.error(`MP API error for preapproval ${preapprovalId}: status=${mpResponse.status}, body=${errorBody}`);

        if (mpResponse.status >= 500) {
          // MP server error — return 500 so the webhook is retried
          return new Response(
            JSON.stringify({ error: `Mercado Pago server error: ${mpResponse.status}` }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // 4xx client error — retrying won't help, accept and log
        await supabase.from('webhook_logs').insert({
          provider: 'mercadopago',
          event_type: 'mp_api_client_error',
          payload: { preapproval_id: preapprovalId, status: mpResponse.status, error: errorBody },
          processed: false,
          error_message: `MP API returned ${mpResponse.status} for preapproval ${preapprovalId}`,
        });
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
      let subscriptionStatus: string | null = null;
      
      if (mpStatus === 'authorized') {
        subscriptionStatus = 'active';
      } else if (mpStatus === 'cancelled') {
        subscriptionStatus = 'cancelled';
      } else if (mpStatus === 'paused') {
        subscriptionStatus = 'paused';
      }

      // If status is pending or unknown, skip - the pending record was already created by create-subscription
      if (!subscriptionStatus) {
        console.log(`Ignoring MP status "${mpStatus}" for user ${user_id} - pending record already exists from create-subscription`);
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`Updating subscription for user ${user_id} to status ${subscriptionStatus}`);

      const now = new Date().toISOString();
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      // Read grace period hours from app_config
      const { data: appConfig } = await supabase
        .from('app_config')
        .select('grace_period_hours')
        .eq('id', 1)
        .single();
      const gracePeriodHours = appConfig?.grace_period_hours ?? 24;

      // Calculate grace period end for paused subscriptions
      const gracePeriodEnd = new Date();
      gracePeriodEnd.setHours(gracePeriodEnd.getHours() + gracePeriodHours);

      // Atomic upsert — eliminates race condition between concurrent webhooks
      const { error: upsertError } = await supabase.rpc('upsert_subscription', {
        _user_id: user_id,
        _plan_id: plan_id,
        _status: subscriptionStatus,
        _mercadopago_preapproval_id: preapprovalId,
        _mercadopago_subscription_id: preapproval.id,
        _current_period_start: subscriptionStatus === 'active' ? now : null,
        _current_period_end: subscriptionStatus === 'active' ? periodEnd.toISOString() : null,
        _grace_period_ends_at: subscriptionStatus === 'paused' ? gracePeriodEnd.toISOString() : null,
      });

      if (upsertError) {
        console.error('Error upserting subscription:', upsertError);
        return new Response(
          JSON.stringify({ error: 'Database error upserting subscription' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If subscription is now active, activate all user's QR codes and send confirmation email
      if (subscriptionStatus === 'active') {
        console.log(`Activating all QR codes for user ${user_id}`);
        
        const { error: qrError } = await supabase
          .from('qr_codes')
          .update({
            status: 'active',
            updated_at: now,
          })
          .eq('user_id', user_id)
          .is('deleted_at', null)
          .in('status', ['paused', 'trial_active', 'expired']);

        if (qrError) {
          console.error('Error activating QR codes:', qrError);
          return new Response(
            JSON.stringify({ error: 'Database error activating QR codes' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          console.log('QR codes activated successfully');
        }

        // Clear account-level trial since user now has a subscription
        await supabase
          .from('profiles')
          .update({
            trial_expires_at: null,
            trial_notice_at: null,
            trial_notice_sent: true,
            trial_notice_48h_at: null,
            trial_notice_48h_sent: true,
          } as any)
          .eq('user_id', user_id);

        // Send subscription confirmation email
        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
        if (RESEND_API_KEY) {
          try {
            // Get user profile
            const { data: profile } = await supabase
              .from('profiles')
              .select('email, full_name')
              .eq('user_id', user_id)
              .maybeSingle();

            // Get plan details
            const { data: plan } = await supabase
              .from('plans')
              .select('name, qr_limit, price_ars')
              .eq('id', plan_id)
              .maybeSingle();

            if (profile?.email && plan) {
              const resend = new Resend(RESEND_API_KEY);
              
              await resend.emails.send({
                from: 'QRapido <noreply@qrapido.io>',
                to: [profile.email],
                subject: '✅ ¡Tu suscripción está activa!',
                html: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Tu suscripción está activa</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f4f5; font-family:Arial, Helvetica, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5; padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%;">
          <tr>
            <td align="center" style="background-color:#1A52F5; border-radius:12px 12px 0 0; padding:28px 40px;">
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="vertical-align:middle; padding-right:10px;">
                    <img src="https://qrapido.io/favicon.ico" alt="QRapido" height="40" style="display:block;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-family:Arial, Helvetica, sans-serif; font-size:22px; font-weight:700; color:#ffffff; letter-spacing:-0.3px;">QRapido</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff; padding:40px 40px 32px 40px;">
              <p style="margin:0 0 8px 0; font-size:12px; color:#6b7280; text-transform:uppercase; letter-spacing:0.8px; font-weight:500;">Suscripción confirmada</p>
              <h1 style="margin:0 0 20px 0; font-size:22px; font-weight:700; color:#111827; line-height:1.3;">
                Tu plan está activo
              </h1>
              <p style="margin:0 0 24px 0; font-size:15px; color:#374151; line-height:1.7;">
                Tu suscripción a QRapido quedó activada. Tus códigos QR están funcionando y van a seguir haciéndolo mientras tu plan esté activo.
              </p>
              <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 28px 0; background-color:#f0fdf4; border-radius:8px; border:1px solid #bbf7d0;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 16px 0; font-size:13px; color:#166534; text-transform:uppercase; letter-spacing:0.8px; font-weight:600;">Detalle de tu plan</p>
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="font-size:14px; color:#374151; padding:6px 0; width:50%;">Plan</td>
                        <td style="font-size:14px; color:#111827; font-weight:600; padding:6px 0; text-align:right;">${plan.name}</td>
                      </tr>
                      <tr>
                        <td style="font-size:14px; color:#374151; padding:6px 0; border-top:1px solid #d1fae5;">QRs disponibles</td>
                        <td style="font-size:14px; color:#111827; font-weight:600; padding:6px 0; border-top:1px solid #d1fae5; text-align:right;">${plan.qr_limit} códigos QR</td>
                      </tr>
                      <tr>
                        <td style="font-size:14px; color:#374151; padding:6px 0; border-top:1px solid #d1fae5;">Monto mensual</td>
                        <td style="font-size:14px; color:#111827; font-weight:600; padding:6px 0; border-top:1px solid #d1fae5; text-align:right;">$${plan.price_ars.toLocaleString('es-AR')} ARS</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 24px 0; font-size:15px; color:#374151; line-height:1.7;">
                Desde tu dashboard podés ver las estadísticas de escaneo, editar la URL de tus QRs y crear nuevos códigos.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 0 32px 0;">
                <tr>
                  <td align="center" style="background-color:#1A52F5; border-radius:8px;">
                    <a href="https://qrapido.io/dashboard"
                       style="display:inline-block; padding:14px 32px; font-size:15px; font-weight:600; color:#ffffff; text-decoration:none;">
                      Ir a mi dashboard →
                    </a>
                  </td>
                </tr>
              </table>
              <hr style="border:none; border-top:1px solid #e5e7eb; margin:0 0 24px 0;" />
              <p style="margin:0; font-size:14px; color:#6b7280; line-height:1.7;">
                Si tenés alguna duda sobre tu suscripción, respondé este mensaje y te ayudamos.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f4f4f5; border-radius:0 0 12px 12px; padding:24px 40px; text-align:center;">
              <p style="margin:0 0 8px 0; font-size:12px; color:#9ca3af;">
                QRapido · Buenos Aires, Argentina
              </p>
              <p style="margin:0; font-size:12px; color:#9ca3af;">
                Recibís este email porque activaste una suscripción en
                <a href="https://qrapido.io" style="color:#6b7280; text-decoration:underline;">qrapido.io</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
              });

              console.log(`Subscription confirmation email sent to ${profile.email}`);

              // Log email sent
              await supabase
                .from('email_logs')
                .insert({
                  user_id,
                  email_type: 'subscription_confirmation',
                  metadata: { plan_id, plan_name: plan.name }
                });
            }
          } catch (emailError) {
            console.error('Error sending subscription confirmation email:', emailError);
          }
        } else {
          console.log('RESEND_API_KEY not configured, skipping confirmation email');
        }
      }

      // If subscription is paused (payment failed), send payment failure email
      if (subscriptionStatus === 'paused') {
        console.log(`Payment failed for user ${user_id}, grace period until ${gracePeriodEnd.toISOString()}`);
        
        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
        if (RESEND_API_KEY) {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('email, full_name')
              .eq('user_id', user_id)
              .maybeSingle();

            const { data: plan } = await supabase
              .from('plans')
              .select('name')
              .eq('id', plan_id)
              .maybeSingle();

            const { data: userQRs } = await supabase
              .from('qr_codes')
              .select('id, name')
              .eq('user_id', user_id)
              .eq('status', 'active');

            if (profile?.email) {
              const resend = new Resend(RESEND_API_KEY);
              const qrNames = userQRs?.map(q => q.name).join(', ') || 'tus QRs';
              const qrCount = userQRs?.length || 0;
              const graceDate = gracePeriodEnd.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

              const qrListHtmlGrace = (userQRs || []).map(q => `
                    <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:8px;">
                      <tr>
                        <td style="width:12px; color:#f59e0b; font-size:14px; padding-right:10px; vertical-align:top;">●</td>
                        <td style="font-size:14px; color:#374151; line-height:1.6;">${q.name}</td>
                      </tr>
                    </table>`).join('');

              await resend.emails.send({
                from: 'QRapido <noreply@qrapido.io>',
                to: [profile.email],
                subject: '⚠️ Problema con tu pago — Tenés 24hs para resolverlo',
                html: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Problema con tu pago</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f4f5; font-family:Arial, Helvetica, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5; padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%;">
          <tr>
            <td align="center" style="background-color:#1A52F5; border-radius:12px 12px 0 0; padding:28px 40px;">
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="vertical-align:middle; padding-right:10px;">
                    <img src="https://qrapido.io/favicon.ico" alt="QRapido" height="40" style="display:block;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-family:Arial, Helvetica, sans-serif; font-size:22px; font-weight:700; color:#ffffff; letter-spacing:-0.3px;">QRapido</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff; padding:40px 40px 32px 40px;">
              <p style="margin:0 0 8px 0; font-size:12px; color:#6b7280; text-transform:uppercase; letter-spacing:0.8px; font-weight:500;">Acción requerida</p>
              <h1 style="margin:0 0 20px 0; font-size:22px; font-weight:700; color:#111827; line-height:1.3;">
                Hubo un problema con tu pago
              </h1>
              <p style="margin:0 0 16px 0; font-size:15px; color:#374151; line-height:1.7;">
                No pudimos procesar el cobro de tu suscripción. Tus QRs siguen activos por ahora, pero necesitás resolver esto antes del <strong>${graceDate}</strong> para evitar que se desactiven.
              </p>
              <p style="margin:0 0 12px 0; font-size:15px; color:#374151; line-height:1.7;">QRs en riesgo de desactivarse:</p>
              <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px 0; background-color:#fef3c7; border-radius:8px; border:1px solid #fde68a;">
                <tr>
                  <td style="padding:16px 20px;">
                    ${qrListHtmlGrace}
                  </td>
                </tr>
              </table>
              <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 28px 0; background-color:#f9fafb; border-radius:8px; border:1px solid #e5e7eb;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 14px 0; font-size:13px; color:#374151; text-transform:uppercase; letter-spacing:0.8px; font-weight:600;">Cómo resolver esto</p>
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="vertical-align:top; padding-right:12px; font-size:14px; color:#1A52F5; font-weight:700; padding-bottom:10px;">1.</td>
                        <td style="font-size:14px; color:#374151; line-height:1.6; padding-bottom:10px;">Verificá que tu tarjeta tenga fondos suficientes</td>
                      </tr>
                      <tr>
                        <td style="vertical-align:top; padding-right:12px; font-size:14px; color:#1A52F5; font-weight:700; padding-bottom:10px;">2.</td>
                        <td style="font-size:14px; color:#374151; line-height:1.6; padding-bottom:10px;">Asegurate de que tu banco no haya bloqueado el cobro</td>
                      </tr>
                      <tr>
                        <td style="vertical-align:top; padding-right:12px; font-size:14px; color:#1A52F5; font-weight:700;">3.</td>
                        <td style="font-size:14px; color:#374151; line-height:1.6;">Mercado Pago va a reintentar el cobro automáticamente</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table cellpadding="0" cellspacing="0" style="margin:0 0 32px 0;">
                <tr>
                  <td align="center" style="background-color:#1A52F5; border-radius:8px;">
                    <a href="https://qrapido.io/dashboard/billing"
                       style="display:inline-block; padding:14px 32px; font-size:15px; font-weight:600; color:#ffffff; text-decoration:none;">
                      Ver mi suscripción →
                    </a>
                  </td>
                </tr>
              </table>
              <hr style="border:none; border-top:1px solid #e5e7eb; margin:0 0 24px 0;" />
              <p style="margin:0; font-size:14px; color:#6b7280; line-height:1.7;">
                Si el problema persiste o tenés alguna duda, respondé este mensaje y te ayudamos.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f4f4f5; border-radius:0 0 12px 12px; padding:24px 40px; text-align:center;">
              <p style="margin:0 0 8px 0; font-size:12px; color:#9ca3af;">
                QRapido · Buenos Aires, Argentina
              </p>
              <p style="margin:0; font-size:12px; color:#9ca3af;">
                Recibís este email porque tenés una suscripción activa en
                <a href="https://qrapido.io" style="color:#6b7280; text-decoration:underline;">qrapido.io</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
              });

              console.log(`Payment failure email sent to ${profile.email}`);

              await supabase
                .from('email_logs')
                .insert({
                  user_id,
                  email_type: 'payment_failed_grace',
                  metadata: { plan_id, grace_period_ends_at: gracePeriodEnd.toISOString(), qr_count: qrCount }
                });
            }
          } catch (emailError) {
            console.error('Error sending payment failure email:', emailError);
          }
        }
      }

      // Mark webhook as successfully processed (idempotency marker)
      if (webhookLogId) {
        await supabase
          .from('webhook_logs')
          .update({ processed: true, processed_at: new Date().toISOString() })
          .eq('id', webhookLogId);
      }
    }

    const processingTimeMs = Date.now() - startTime;
    console.log('Webhook processed successfully', {
      preapproval_id: body.data?.id,
      event_type: body.type || body.action,
      processing_time_ms: processingTimeMs,
    });

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const processingTimeMs = Date.now() - startTime;
    console.error('Webhook error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processing_time_ms: processingTimeMs,
    });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
