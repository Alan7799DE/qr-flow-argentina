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
    
    // Log everything for debugging
    console.log('=== WEBHOOK DEBUG START ===');
    console.log('Headers x-signature:', xSignature);
    console.log('Headers x-request-id:', xRequestId);
    console.log('Query params:', Object.fromEntries(url.searchParams.entries()));
    console.log('Body:', JSON.stringify(body));
    console.log('=== WEBHOOK DEBUG END ===');

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
      console.error('Invalid webhook signature - rejecting request', {
        xSignature: xSignature?.substring(0, 30) + '...',
        xRequestId,
        dataId,
        queryDataId,
        bodyDataId: body.data?.id
      });
      
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

    console.log('Webhook signature verified successfully');

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

      // If subscription is now active, activate all user's QR codes and send confirmation email
      if (subscriptionStatus === 'active') {
        console.log(`Activating all QR codes for user ${user_id}`);
        
        const { error: qrError } = await supabase
          .from('qr_codes')
          .update({
            status: 'active',
            updated_at: now,
          })
          .eq('user_id', user_id);

        if (qrError) {
          console.error('Error activating QR codes:', qrError);
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
                from: 'QRapido <noreply@qrapido.com>',
                to: [profile.email],
                subject: '✅ ¡Tu suscripción está activa!',
                html: `
                  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #1a1a1a; font-size: 24px;">¡Hola${profile.full_name ? ` ${profile.full_name}` : ''}!</h1>
                    
                    <p style="color: #666; font-size: 16px; line-height: 1.6;">
                      Tu suscripción al plan <strong>${plan.name}</strong> ya está activa. ¡Gracias por confiar en QRapido!
                    </p>
                    
                    <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 12px; padding: 20px; margin: 24px 0; color: white;">
                      <h2 style="margin: 0 0 16px; font-size: 20px;">Tu plan incluye:</h2>
                      <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">
                        <li>Hasta <strong>${plan.qr_limit}</strong> códigos QR activos</li>
                        <li>Estadísticas detalladas de escaneos</li>
                        <li>QRs dinámicos (podés cambiar el destino cuando quieras)</li>
                        <li>Soporte prioritario</li>
                      </ul>
                    </div>
                    
                    <p style="color: #666; font-size: 16px; line-height: 1.6;">
                      Todos tus códigos QR existentes ahora están <strong>activos permanentemente</strong> mientras mantengas tu suscripción.
                    </p>
                    
                    <a href="https://creatuqr.lovable.app/dashboard" 
                       style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; margin: 20px 0;">
                      Ir a mi dashboard
                    </a>
                    
                    <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px;">
                      <p style="color: #999; font-size: 14px; margin: 0;">
                        Monto mensual: <strong style="color: #333;">$${plan.price_ars.toLocaleString('es-AR')} ARS</strong>
                      </p>
                      <p style="color: #999; font-size: 14px; margin: 8px 0 0;">
                        Si tenés alguna pregunta, respondé a este email.
                      </p>
                    </div>
                    
                    <p style="color: #333; font-size: 14px; margin-top: 20px;">
                      — El equipo de QRapido
                    </p>
                  </div>
                `,
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
