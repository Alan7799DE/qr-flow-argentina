import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { verifyCronAuth } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  const bearerToken = authHeader?.replace('Bearer ', '');

  if (!verifyCronAuth(bearerToken)) {
    console.error('Unauthorized access attempt - invalid or missing authorization');
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log('Starting account-level trial expiration job...');

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

    const now = new Date().toISOString();
    let expiredCount = 0;
    let notifiedCount = 0;

    // Step 1: Expire accounts whose trial has passed
    // Find profiles with expired trials that still have trial_active QRs
    console.log('Checking for expired account trials...');
    const { data: expiredProfiles, error: expiredError } = await supabase
      .from('profiles')
      .select('user_id')
      .not('trial_expires_at', 'is', null)
      .lte('trial_expires_at', now);

    if (expiredError) {
      console.error('Error fetching expired profiles:', expiredError);
    } else if (expiredProfiles && expiredProfiles.length > 0) {
      for (const profile of expiredProfiles) {
        // Check if user has an active subscription (skip if they do)
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('status')
          .eq('user_id', profile.user_id)
          .eq('status', 'active')
          .maybeSingle();

        if (subscription) {
          console.log(`User ${profile.user_id} has active subscription, skipping expiration`);
          continue;
        }

        // Get QR info before expiring (for the email)
        const { data: userQRs } = await supabase
          .from('qr_codes')
          .select('id, name')
          .eq('user_id', profile.user_id)
          .eq('status', 'trial_active');

        // Expire all trial_active QRs for this user
        const { data: expired, error: expireErr } = await supabase
          .from('qr_codes')
          .update({ status: 'paused', updated_at: now })
          .eq('user_id', profile.user_id)
          .eq('status', 'trial_active')
          .select('id');

        if (expireErr) {
          console.error(`Error pausing QRs for user ${profile.user_id}:`, expireErr);
        } else {
          expiredCount += expired?.length || 0;
          console.log(`Paused ${expired?.length || 0} QRs for user ${profile.user_id} (trial expired)`);

          // Send trial expired email
          if (resend && expired && expired.length > 0) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('email, full_name')
              .eq('user_id', profile.user_id)
              .single();

            if (profileData?.email) {
              // Check if we already sent this email
              const { data: existingLog } = await supabase
                .from('email_logs')
                .select('id')
                .eq('user_id', profile.user_id)
                .eq('email_type', 'trial_expired')
                .maybeSingle();

              if (!existingLog) {
                const qrListHtmlExpired = (userQRs || []).map(q => `
                    <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:8px;">
                      <tr>
                        <td style="width:12px; color:#ef4444; font-size:14px; padding-right:10px; vertical-align:top;">●</td>
                        <td style="font-size:14px; color:#374151; line-height:1.6;">${q.name}</td>
                      </tr>
                    </table>`).join('');

                try {
                  await resend.emails.send({
                    from: 'QRapido <noreply@qrapido.io>',
                    to: [profileData.email],
                    subject: '❌ Tu período de prueba expiró',
                    html: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Tu período de prueba expiró</title>
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
              <p style="margin:0 0 8px 0; font-size:12px; color:#6b7280; text-transform:uppercase; letter-spacing:0.8px; font-weight:500;">Tu período de prueba finalizó</p>
              <h1 style="margin:0 0 20px 0; font-size:22px; font-weight:700; color:#111827; line-height:1.3;">
                Tus QRs fueron desactivados
              </h1>
              <p style="margin:0 0 16px 0; font-size:15px; color:#374151; line-height:1.7;">
                Tu período de prueba gratuito terminó. Los siguientes QRs ya no están redirigiendo a quienes los escaneen:
              </p>
              <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px 0; background-color:#fef2f2; border-radius:8px; border:1px solid #fecaca;">
                <tr>
                  <td style="padding:16px 20px;">
                    ${qrListHtmlExpired}
                  </td>
                </tr>
              </table>
              <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 28px 0; background-color:#f0fdf4; border-radius:8px; border:1px solid #bbf7d0;">
                <tr>
                  <td style="padding:16px 20px; font-size:14px; color:#166534; line-height:1.6;">
                    Tus datos están guardados. Si activás un plan, tus QRs se reactivan automáticamente con la misma configuración que tenían.
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 24px 0; font-size:15px; color:#374151; line-height:1.7;">
                Para reactivarlos, elegí un plan desde tu dashboard.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 0 32px 0;">
                <tr>
                  <td align="center" style="background-color:#1A52F5; border-radius:8px;">
                    <a href="https://qrapido.io/dashboard/billing"
                       style="display:inline-block; padding:14px 32px; font-size:15px; font-weight:600; color:#ffffff; text-decoration:none;">
                      Elegir un plan →
                    </a>
                  </td>
                </tr>
              </table>
              <hr style="border:none; border-top:1px solid #e5e7eb; margin:0 0 24px 0;" />
              <p style="margin:0; font-size:14px; color:#6b7280; line-height:1.7;">
                Si tenés alguna duda, respondé este mensaje y te ayudamos.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f4f4f5; border-radius:0 0 12px 12px; padding:24px 40px; text-align:center;">
              <p style="margin:0 0 8px 0; font-size:12px; color:#9ca3af;">
                QRapido · Buenos Aires, Argentina
              </p>
              <p style="margin:0; font-size:12px; color:#9ca3af;">
                Recibís este email porque tenés una cuenta en
                <a href="https://qrapido.io" style="color:#6b7280; text-decoration:underline;">qrapido.io</a>.
                <br />
                <a href="https://qrapido.io/unsubscribe?email=${encodeURIComponent(profileData.email)}" style="color:#6b7280; text-decoration:underline;">
                  Desuscribirse de estos emails
                </a>
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

                  console.log(`Trial expired email sent to ${profileData.email}`);

                  await supabase
                    .from('email_logs')
                    .insert({
                      user_id: profile.user_id,
                      email_type: 'trial_expired',
                      metadata: { qr_ids: expired.map(q => q.id), qr_names: userQRs?.map(q => q.name) || [] }
                    });
                } catch (emailError) {
                  console.error(`Error sending trial expired email to ${profileData.email}:`, emailError);
                }
              }
            }
          }
        }
      }
    }

    // Step 2: Send 48h notices for accounts approaching trial expiration
    let notified48hCount = 0;
    console.log('Checking for accounts needing 48h trial notice...');
    const { data: profiles48h, error: notice48hError } = await supabase
      .from('profiles')
      .select('user_id, email, full_name, trial_expires_at, trial_notice_48h_sent')
      .not('trial_notice_48h_at', 'is', null)
      .lte('trial_notice_48h_at', now)
      .eq('trial_notice_48h_sent', false);

    if (notice48hError) {
      console.error('Error fetching profiles for 48h notice:', notice48hError);
    } else if (profiles48h && profiles48h.length > 0) {
      console.log(`Found ${profiles48h.length} accounts needing 48h notice`);

      for (const profile of profiles48h) {
        // Check if user has active subscription
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('status')
          .eq('user_id', profile.user_id)
          .eq('status', 'active')
          .maybeSingle();

        if (subscription) {
          console.log(`User ${profile.user_id} has active subscription, skipping 48h notice`);
          await supabase
            .from('profiles')
            .update({ trial_notice_48h_sent: true } as any)
            .eq('user_id', profile.user_id);
          continue;
        }

        // Get user's QR names
        const { data: userQRs } = await supabase
          .from('qr_codes')
          .select('id, name')
          .eq('user_id', profile.user_id)
          .eq('status', 'trial_active');

        const qrNames = userQRs?.map(q => q.name).join(', ') || 'tus QRs';
        const qrCount = userQRs?.length || 0;
        const expirationDate = new Date(profile.trial_expires_at!).toLocaleDateString('es-AR');

        if (resend && profile.email) {
          try {
            const qrListHtml = (userQRs || []).map(q => `
                    <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:8px;">
                      <tr>
                        <td style="width:12px; color:#1A52F5; font-size:14px; padding-right:10px; vertical-align:top;">●</td>
                        <td style="font-size:14px; color:#374151; line-height:1.6;">${q.name}</td>
                      </tr>
                    </table>`).join('');

            await resend.emails.send({
              from: 'QRapido <noreply@qrapido.io>',
              to: [profile.email],
              subject: '⏰ Tu período de prueba vence en 2 días',
              html: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Tu período de prueba vence en 2 días</title>
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
              <p style="margin:0 0 8px 0; font-size:12px; color:#6b7280; text-transform:uppercase; letter-spacing:0.8px; font-weight:500;">Aviso de vencimiento</p>
              <h1 style="margin:0 0 20px 0; font-size:22px; font-weight:700; color:#111827; line-height:1.3;">
                Tu prueba gratuita vence en 2 días
              </h1>
              <p style="margin:0 0 16px 0; font-size:15px; color:#374151; line-height:1.7;">
                El <strong>${expirationDate}</strong> termina tu período de prueba. Si no tenés un plan activo para esa fecha, tus códigos QR van a dejar de redirigir a quienes los escaneen.
              </p>
              <p style="margin:0 0 12px 0; font-size:15px; color:#374151; line-height:1.7;">
                Tus QRs activos en este momento:
              </p>
              <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 28px 0; background-color:#f9fafb; border-radius:8px; border:1px solid #e5e7eb;">
                <tr>
                  <td style="padding:16px 20px;">
                    ${qrListHtml}
                  </td>
                </tr>
              </table>
              <table cellpadding="0" cellspacing="0" style="margin:0 0 32px 0;">
                <tr>
                  <td align="center" style="background-color:#1A52F5; border-radius:8px;">
                    <a href="https://qrapido.io/dashboard/billing"
                       style="display:inline-block; padding:14px 32px; font-size:15px; font-weight:600; color:#ffffff; text-decoration:none;">
                      Ver planes →
                    </a>
                  </td>
                </tr>
              </table>
              <hr style="border:none; border-top:1px solid #e5e7eb; margin:0 0 24px 0;" />
              <p style="margin:0; font-size:14px; color:#6b7280; line-height:1.7;">
                Si ya tenés un plan activo, ignorá este email. Si tenés alguna duda, respondé este mensaje y te ayudamos.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f4f4f5; border-radius:0 0 12px 12px; padding:24px 40px; text-align:center;">
              <p style="margin:0 0 8px 0; font-size:12px; color:#9ca3af;">
                QRapido · Buenos Aires, Argentina
              </p>
              <p style="margin:0; font-size:12px; color:#9ca3af;">
                Recibís este email porque tenés una cuenta en
                <a href="https://qrapido.io" style="color:#6b7280; text-decoration:underline;">qrapido.io</a>.
                <br />
                <a href="https://qrapido.io/unsubscribe?email=${encodeURIComponent(profile.email)}" style="color:#6b7280; text-decoration:underline;">
                  Desuscribirse de estos emails
                </a>
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

            console.log(`48h notice email sent to ${profile.email}`);
            notified48hCount++;

            await supabase
              .from('email_logs')
              .insert({
                user_id: profile.user_id,
                email_type: 'trial_48h_notice',
                metadata: { qr_ids: userQRs?.map(q => q.id) || [], qr_names: userQRs?.map(q => q.name) || [] }
              });
          } catch (emailError) {
            console.error(`Error sending 48h notice email to ${profile.email}:`, emailError);
          }
        }

        // Mark as notified
        await supabase
          .from('profiles')
          .update({ trial_notice_48h_sent: true } as any)
          .eq('user_id', profile.user_id);
      }
    }

    // Step 3: Send notices for accounts approaching trial expiration (24h)
    console.log('Checking for accounts needing trial notice...');
    const { data: profilesNeedingNotice, error: noticeError } = await supabase
      .from('profiles')
      .select('user_id, email, full_name, trial_expires_at, trial_notice_sent')
      .not('trial_notice_at', 'is', null)
      .lte('trial_notice_at', now)
      .eq('trial_notice_sent', false);

    if (noticeError) {
      console.error('Error fetching profiles for notice:', noticeError);
    } else if (profilesNeedingNotice && profilesNeedingNotice.length > 0) {
      console.log(`Found ${profilesNeedingNotice.length} accounts needing notice`);

      for (const profile of profilesNeedingNotice) {
        // Check if user has active subscription (skip if they do)
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('status')
          .eq('user_id', profile.user_id)
          .eq('status', 'active')
          .maybeSingle();

        if (subscription) {
          console.log(`User ${profile.user_id} has active subscription, skipping notice`);
          await supabase
            .from('profiles')
            .update({ trial_notice_sent: true } as any)
            .eq('user_id', profile.user_id);
          continue;
        }

        // Get user's QR names for the email
        const { data: userQRs } = await supabase
          .from('qr_codes')
          .select('id, name')
          .eq('user_id', profile.user_id)
          .eq('status', 'trial_active');

        const qrNames = userQRs?.map(q => q.name).join(', ') || 'tus QRs';
        const qrCount = userQRs?.length || 0;
        const expirationDate = new Date(profile.trial_expires_at!).toLocaleDateString('es-AR');

        // Send email
        if (resend && profile.email) {
          try {
            const qrListHtml24h = (userQRs || []).map(q => `
                    <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:8px;">
                      <tr>
                        <td style="width:12px; color:#f97316; font-size:14px; padding-right:10px; vertical-align:top;">●</td>
                        <td style="font-size:14px; color:#374151; line-height:1.6;">${q.name}</td>
                      </tr>
                    </table>`).join('');

            await resend.emails.send({
              from: 'QRapido <noreply@qrapido.io>',
              to: [profile.email],
              subject: '⚠️ Tu período de prueba expira mañana',
              html: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Tu período de prueba expira mañana</title>
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
            <td align="center" style="background-color:#fef3c7; padding:12px 40px; border-left:4px solid #f59e0b;">
              <p style="margin:0; font-size:13px; font-weight:600; color:#92400e;">
                ⚠️ Último aviso — tu prueba vence mañana
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff; padding:40px 40px 32px 40px;">
              <p style="margin:0 0 8px 0; font-size:12px; color:#6b7280; text-transform:uppercase; letter-spacing:0.8px; font-weight:500;">Último aviso</p>
              <h1 style="margin:0 0 20px 0; font-size:22px; font-weight:700; color:#111827; line-height:1.3;">
                Mañana tus QRs dejan de funcionar
              </h1>
              <p style="margin:0 0 16px 0; font-size:15px; color:#374151; line-height:1.7;">
                Tu período de prueba vence el <strong>${expirationDate}</strong>. A partir de esa fecha, tus códigos QR van a dejar de redirigir a quienes los escaneen — hasta que actives un plan.
              </p>
              <p style="margin:0 0 12px 0; font-size:15px; color:#374151; line-height:1.7;">
                QRs que se van a desactivar:
              </p>
              <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 28px 0; background-color:#fff7ed; border-radius:8px; border:1px solid #fed7aa;">
                <tr>
                  <td style="padding:16px 20px;">
                    ${qrListHtml24h}
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 24px 0; font-size:15px; color:#374151; line-height:1.7;">
                Activar un plan toma menos de 2 minutos y tus QRs siguen funcionando sin interrupciones.
              </p>
              <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 32px 0;">
                <tr>
                  <td align="center" style="background-color:#1A52F5; border-radius:8px;">
                    <a href="https://qrapido.io/dashboard/billing"
                       style="display:inline-block; padding:16px 40px; font-size:16px; font-weight:700; color:#ffffff; text-decoration:none;">
                      Activar mi plan ahora →
                    </a>
                  </td>
                </tr>
              </table>
              <hr style="border:none; border-top:1px solid #e5e7eb; margin:0 0 24px 0;" />
              <p style="margin:0; font-size:14px; color:#6b7280; line-height:1.7;">
                Si ya activaste un plan, ignorá este email. Ante cualquier duda, respondé este mensaje y te ayudamos.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f4f4f5; border-radius:0 0 12px 12px; padding:24px 40px; text-align:center;">
              <p style="margin:0 0 8px 0; font-size:12px; color:#9ca3af;">
                QRapido · Buenos Aires, Argentina
              </p>
              <p style="margin:0; font-size:12px; color:#9ca3af;">
                Recibís este email porque tenés una cuenta en
                <a href="https://qrapido.io" style="color:#6b7280; text-decoration:underline;">qrapido.io</a>.
                <br />
                <a href="https://qrapido.io/unsubscribe?email=${encodeURIComponent(profile.email)}" style="color:#6b7280; text-decoration:underline;">
                  Desuscribirse de estos emails
                </a>
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

            console.log(`Email sent to ${profile.email} for account trial expiration`);
            notifiedCount++;

            // Log email sent
            await supabase
              .from('email_logs')
              .insert({
                user_id: profile.user_id,
                email_type: 'trial_expiration_notice',
                metadata: { qr_ids: userQRs?.map(q => q.id) || [], qr_names: userQRs?.map(q => q.name) || [] }
              });

          } catch (emailError) {
            console.error(`Error sending email to ${profile.email}:`, emailError);
          }
        }

        // Mark profile as notified
        await supabase
          .from('profiles')
          .update({ trial_notice_sent: true } as any)
          .eq('user_id', profile.user_id);
      }
    }

    // Step 3: Expire paused subscriptions past grace period
    let gracePeriodExpiredCount = 0;
    console.log('Checking for paused subscriptions past grace period...');

    const { data: pausedSubs, error: pausedError } = await supabase
      .from('subscriptions')
      .select('id, user_id, plan_id')
      .eq('status', 'paused')
      .not('grace_period_ends_at', 'is', null)
      .lte('grace_period_ends_at', now);

    if (pausedError) {
      console.error('Error fetching paused subscriptions:', pausedError);
    } else if (pausedSubs && pausedSubs.length > 0) {
      console.log(`Found ${pausedSubs.length} paused subscriptions past grace period`);

      for (const sub of pausedSubs) {
        // Update subscription to cancelled
        const { error: cancelErr } = await supabase
          .from('subscriptions')
          .update({ status: 'cancelled', grace_period_ends_at: null, updated_at: now })
          .eq('id', sub.id);

        if (cancelErr) {
          console.error(`Error cancelling subscription ${sub.id}:`, cancelErr);
          continue;
        }

        // Expire all active QRs for this user
        const { data: expiredQRs, error: qrErr } = await supabase
          .from('qr_codes')
          .update({ status: 'expired', updated_at: now })
          .eq('user_id', sub.user_id)
          .eq('status', 'active')
          .select('id, name');

        if (qrErr) {
          console.error(`Error expiring QRs for user ${sub.user_id}:`, qrErr);
        } else {
          gracePeriodExpiredCount += expiredQRs?.length || 0;
          console.log(`Grace period expired: cancelled sub ${sub.id}, expired ${expiredQRs?.length || 0} QRs`);

          // Send grace period expired email
          if (resend && expiredQRs && expiredQRs.length > 0) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('email, full_name')
              .eq('user_id', sub.user_id)
              .single();

            if (profileData?.email) {
              const qrNames = expiredQRs.map(q => q.name).join(', ') || 'tus QRs';
              try {
                await resend.emails.send({
                  from: 'QRapido <noreply@qrapido.io>',
                  to: [profileData.email],
                  subject: '❌ Tus QRs fueron desactivados por falta de pago',
                  html: `
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                      <h1 style="color: #1a1a1a; font-size: 24px;">Hola${profileData.full_name ? ` ${profileData.full_name}` : ''}!</h1>
                      <p style="color: #666; font-size: 16px; line-height: 1.6;">
                        El período de gracia de 24 horas finalizó y no pudimos procesar tu pago.
                      </p>
                      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0;">
                        <p style="margin: 0; color: #991b1b; font-weight: 600;">
                          QRs desactivados: ${qrNames}
                        </p>
                        <p style="margin: 8px 0 0; color: #991b1b;">
                          Las personas que escaneen estos QRs ya no podrán acceder a los enlaces.
                        </p>
                      </div>
                      <p style="color: #666; font-size: 16px; line-height: 1.6;">
                        <strong>Podés reactivarlos</strong> suscribiéndote nuevamente a un plan.
                      </p>
                      <a href="https://qrapido.io/dashboard/billing" 
                         style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; margin: 20px 0;">
                        Elegir un plan
                      </a>
                      <p style="color: #999; font-size: 14px; margin-top: 30px;">
                        Si tenés alguna pregunta, respondé a este email.
                      </p>
                      <p style="color: #333; font-size: 14px;">— El equipo de QRapido</p>
                    </div>
                  `,
                });
                console.log(`Grace period expired email sent to ${profileData.email}`);
                await supabase.from('email_logs').insert({
                  user_id: sub.user_id,
                  email_type: 'grace_period_expired',
                  metadata: { qr_ids: expiredQRs.map(q => q.id) }
                });
              } catch (emailError) {
                console.error(`Error sending grace period expired email:`, emailError);
              }
            }
          }
        }
      }
    }

    console.log(`Job completed. Expired: ${expiredCount}, Notified 48h: ${notified48hCount}, Notified 24h: ${notifiedCount}, Grace period expired: ${gracePeriodExpiredCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        expired_count: expiredCount,
        notified_48h_count: notified48hCount,
        notified_count: notifiedCount,
        grace_period_expired_count: gracePeriodExpiredCount,
        timestamp: now,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in process-trial-expirations:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});