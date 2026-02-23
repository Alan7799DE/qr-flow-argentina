import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Validate authorization - accept service role key or CRON_SECRET
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const CRON_SECRET = Deno.env.get('CRON_SECRET');
  const authHeader = req.headers.get('Authorization');
  const bearerToken = authHeader?.replace('Bearer ', '');

  const isAuthorized = bearerToken && (
    bearerToken === SUPABASE_SERVICE_ROLE_KEY || 
    bearerToken === CRON_SECRET
  );

  if (!isAuthorized) {
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
          .update({ status: 'expired', updated_at: now })
          .eq('user_id', profile.user_id)
          .eq('status', 'trial_active')
          .select('id');

        if (expireErr) {
          console.error(`Error expiring QRs for user ${profile.user_id}:`, expireErr);
        } else {
          expiredCount += expired?.length || 0;
          console.log(`Expired ${expired?.length || 0} QRs for user ${profile.user_id}`);

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
                const qrNames = userQRs?.map(q => q.name).join(', ') || 'tus QRs';
                const qrCount = userQRs?.length || 0;

                try {
                  await resend.emails.send({
                    from: 'QRapido <onboarding@resend.dev>',
                    to: [profileData.email],
                    subject: '❌ Tu período de prueba expiró',
                    html: `
                      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h1 style="color: #1a1a1a; font-size: 24px;">Hola${profileData.full_name ? ` ${profileData.full_name}` : ''}!</h1>
                        
                        <p style="color: #666; font-size: 16px; line-height: 1.6;">
                          Tu período de prueba en QRapido ha finalizado.
                        </p>
                        
                        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0;">
                          <p style="margin: 0; color: #991b1b; font-weight: 600;">
                            ${qrCount > 1 ? `${qrCount} códigos QR desactivados` : '1 código QR desactivado'}: ${qrNames}
                          </p>
                          <p style="margin: 8px 0 0; color: #991b1b;">
                            Las personas que escaneen estos QRs ya no podrán acceder a los enlaces.
                          </p>
                        </div>
                        
                        <p style="color: #666; font-size: 16px; line-height: 1.6;">
                          <strong>Podés reactivarlos en cualquier momento</strong> eligiendo un plan de suscripción. Tus QRs y estadísticas se mantienen guardados.
                        </p>
                        
                        <a href="https://creatuqr.lovable.app/dashboard/billing" 
                           style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; margin: 20px 0;">
                          Elegir un plan
                        </a>
                        
                        <p style="color: #999; font-size: 14px; margin-top: 30px;">
                          Si tenés alguna pregunta, respondé a este email.
                        </p>
                        
                        <p style="color: #333; font-size: 14px;">
                          — El equipo de QRapido
                        </p>
                      </div>
                    `,
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

    // Step 2: Send notices for accounts approaching trial expiration
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
            await resend.emails.send({
              from: 'QRapido <onboarding@resend.dev>',
              to: [profile.email],
              subject: '⚠️ Tu período de prueba está por expirar',
              html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h1 style="color: #1a1a1a; font-size: 24px;">Hola${profile.full_name ? ` ${profile.full_name}` : ''}!</h1>
                  
                  <p style="color: #666; font-size: 16px; line-height: 1.6;">
                    Te escribimos para avisarte que tu período de prueba está por expirar.
                  </p>
                  
                  <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 20px 0;">
                    <p style="margin: 0; color: #333; font-weight: 600;">
                      ${qrCount > 1 ? `${qrCount} códigos QR` : '1 código QR'}: ${qrNames}
                    </p>
                    <p style="margin: 8px 0 0; color: #666;">
                      Fecha de expiración de tu cuenta: ${expirationDate}
                    </p>
                  </div>
                  
                  <p style="color: #666; font-size: 16px; line-height: 1.6;">
                    Después de esta fecha, todos tus QRs dejarán de funcionar y las personas que los escaneen no podrán acceder a los enlaces.
                  </p>
                  
                  <p style="color: #666; font-size: 16px; line-height: 1.6;">
                    <strong>¿Querés mantenerlos activos?</strong> Elegí un plan de suscripción para que sigan funcionando sin interrupciones.
                  </p>
                  
                  <a href="https://creatuqr.lovable.app/dashboard/billing" 
                     style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; margin: 20px 0;">
                    Ver planes
                  </a>
                  
                  <p style="color: #999; font-size: 14px; margin-top: 30px;">
                    Si tenés alguna pregunta, respondé a este email.
                  </p>
                  
                  <p style="color: #333; font-size: 14px;">
                    — El equipo de QRapido
                  </p>
                </div>
              `,
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

    console.log(`Job completed. Expired: ${expiredCount}, Notified: ${notifiedCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        expired_count: expiredCount,
        notified_count: notifiedCount,
        timestamp: now,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in process-trial-expirations:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});