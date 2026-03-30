import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Resend not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user identity via auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await serviceClient.auth.getUser(token);

    if (userError || !user) {
      console.error('Auth error:', userError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { qr_name } = await req.json();

    // Check if this is truly their first QR (count should be 1 after creation)
    
    const { count } = await serviceClient
      .from('qr_codes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (count !== 1) {
      return new Response(
        JSON.stringify({ skipped: true, reason: 'Not first QR' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if we already sent this email type
    const { data: existingLog } = await serviceClient
      .from('email_logs')
      .select('id')
      .eq('user_id', user.id)
      .eq('email_type', 'first_qr_welcome')
      .maybeSingle();

    if (existingLog) {
      return new Response(
        JSON.stringify({ skipped: true, reason: 'Email already sent' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user profile
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('email, full_name, trial_expires_at')
      .eq('user_id', user.id)
      .single();

    if (!profile?.email) {
      return new Response(
        JSON.stringify({ error: 'No profile found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const nombreQr = qr_name || 'Tu QR';
    const fechaTrial = profile.trial_expires_at
      ? new Date(profile.trial_expires_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'próximamente';
    const emailUsuario = encodeURIComponent(profile.email);

    const resend = new Resend(RESEND_API_KEY);

    const { data: emailData, error: sendError } = await resend.emails.send({
      from: 'QRapido <noreply@qrapido.io>',
      to: [profile.email],
      subject: '🎉 ¡Creaste tu primer QR en QRapido!',
      html: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>¡Creaste tu primer QR en QRapido!</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f4f5; font-family:Arial, Helvetica, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5; padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%;">
          <!-- HEADER -->
          <tr>
            <td align="center" style="background-color:#1A52F5; border-radius:12px 12px 0 0; padding:28px 40px;">
              <img src="https://qrapido.io/logo-white.png" alt="QRapido" height="36" style="display:block;" />
            </td>
          </tr>
          <!-- CUERPO -->
          <tr>
            <td style="background-color:#ffffff; padding:40px 40px 32px 40px;">
              <p style="margin:0 0 8px 0; font-size:13px; color:#6b7280; text-transform:uppercase; letter-spacing:0.5px;">Tu QR está listo</p>
              <h1 style="margin:0 0 24px 0; font-size:24px; font-weight:700; color:#111827; line-height:1.3;">
                Ya podés usar tu código QR
              </h1>
              <p style="margin:0 0 16px 0; font-size:16px; color:#374151; line-height:1.6;">
                Creaste <strong>${nombreQr}</strong> y ya está activo. Podés pegarlo donde quieras — menú, cartel, tarjeta, lo que sea.
              </p>
              <p style="margin:0 0 24px 0; font-size:16px; color:#374151; line-height:1.6;">
                Como es dinámico, podés cambiar la URL a la que apunta cuando quieras, sin tener que reimprimir nada.
              </p>
              <!-- CTA -->
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
              <!-- DIVISOR -->
              <hr style="border:none; border-top:1px solid #e5e7eb; margin:0 0 24px 0;" />
              <p style="margin:0 0 12px 0; font-size:14px; font-weight:600; color:#111827;">
                ¿Qué más podés hacer desde el dashboard?
              </p>
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding:6px 0; font-size:14px; color:#374151;">
                    📊 &nbsp;Ver cuántas veces fue escaneado tu QR y desde dónde
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0; font-size:14px; color:#374151;">
                    ✏️ &nbsp;Cambiar la URL de destino en cualquier momento
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0; font-size:14px; color:#374151;">
                    🎨 &nbsp;Personalizar los colores del QR
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0; font-size:14px; color:#374151;">
                    📥 &nbsp;Descargar el QR en PNG, JPG o SVG
                  </td>
                </tr>
              </table>
              <!-- AVISO TRIAL -->
              <table cellpadding="0" cellspacing="0" width="100%" style="margin-top:28px; background-color:#eff6ff; border-radius:8px; border:1px solid #bfdbfe;">
                <tr>
                  <td style="padding:16px 20px; font-size:14px; color:#1e40af; line-height:1.5;">
                    Estás en tu período de prueba gratuito — vence el <strong>${fechaTrial}</strong>.
                    Después de esa fecha necesitás un plan activo para que tus QRs sigan funcionando.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- FOOTER -->
          <tr>
            <td style="background-color:#f4f4f5; border-radius:0 0 12px 12px; padding:24px 40px; text-align:center;">
              <p style="margin:0 0 8px 0; font-size:12px; color:#9ca3af;">
                QRapido · Buenos Aires, Argentina
              </p>
              <p style="margin:0; font-size:12px; color:#9ca3af;">
                Recibís este email porque creaste una cuenta en
                <a href="https://qrapido.io" style="color:#6b7280; text-decoration:underline;">qrapido.io</a>.
                <br />
                <a href="https://qrapido.io/unsubscribe?email=${emailUsuario}" style="color:#6b7280; text-decoration:underline;">
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

    if (sendError || !emailData?.id) {
      const providerError = sendError
        ? ((sendError as { message?: string }).message || JSON.stringify(sendError))
        : 'Email provider did not return an id';

      console.error('Resend rejected welcome email:', providerError);
      return new Response(
        JSON.stringify({ error: 'Email delivery failed', details: providerError }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the email
    const { error: logError } = await serviceClient
      .from('email_logs')
      .insert({
        user_id: user.id,
        email_type: 'first_qr_welcome',
        metadata: { qr_name, resend_email_id: emailData.id },
      });

    if (logError) {
      console.error('Error logging email send:', logError);
    }

    console.log(`First QR welcome email sent to ${profile.email} (id: ${emailData.id})`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error sending first QR email:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
