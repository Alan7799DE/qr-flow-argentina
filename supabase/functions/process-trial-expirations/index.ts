import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QRCode {
  id: string;
  name: string;
  slug: string;
  user_id: string;
  trial_expires_at: string;
  trial_notice_at: string;
  trial_notice_sent: boolean;
}

interface UserQRs {
  email: string;
  full_name: string | null;
  qrs: QRCode[];
}

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

  console.log('Starting trial expiration job...');

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

    // Step 1: Expire QRs that have passed their trial_expires_at
    console.log('Checking for expired trials...');
    const { data: expiredQRs, error: expireError } = await supabase
      .from('qr_codes')
      .update({ 
        status: 'expired',
        updated_at: now 
      })
      .eq('status', 'trial_active')
      .lte('trial_expires_at', now)
      .select('id, name, user_id');

    if (expireError) {
      console.error('Error expiring QRs:', expireError);
    } else {
      expiredCount = expiredQRs?.length || 0;
      console.log(`Expired ${expiredCount} QR codes`);
    }

    // Step 2: Find QRs that need notice (trial_notice_at passed, not sent yet)
    console.log('Checking for QRs needing notice...');
    const { data: qrsNeedingNotice, error: noticeError } = await supabase
      .from('qr_codes')
      .select('id, name, slug, user_id, trial_expires_at, trial_notice_at, trial_notice_sent')
      .eq('status', 'trial_active')
      .eq('trial_notice_sent', false)
      .lte('trial_notice_at', now);

    if (noticeError) {
      console.error('Error fetching QRs for notice:', noticeError);
    } else if (qrsNeedingNotice && qrsNeedingNotice.length > 0) {
      console.log(`Found ${qrsNeedingNotice.length} QRs needing notice`);

      // Group QRs by user
      const userQRsMap = new Map<string, QRCode[]>();
      for (const qr of qrsNeedingNotice) {
        const existing = userQRsMap.get(qr.user_id) || [];
        existing.push(qr);
        userQRsMap.set(qr.user_id, existing);
      }

      // Get user emails
      const userIds = Array.from(userQRsMap.keys());
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email, full_name')
        .in('user_id', userIds);

      // Send emails grouped by user
      for (const [userId, qrs] of userQRsMap.entries()) {
        const profile = profiles?.find(p => p.user_id === userId);
        if (!profile?.email) {
          console.log(`No email found for user ${userId}, skipping`);
          continue;
        }

        // Check if user has active subscription (skip if they do)
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('status')
          .eq('user_id', userId)
          .eq('status', 'active')
          .maybeSingle();

        if (subscription) {
          console.log(`User ${userId} has active subscription, skipping notice`);
          // Mark as sent since they don't need the notice
          await supabase
            .from('qr_codes')
            .update({ trial_notice_sent: true, updated_at: now })
            .in('id', qrs.map(q => q.id));
          continue;
        }

        // Send email
        if (resend) {
          try {
            const qrNames = qrs.map(q => q.name).join(', ');
            const expirationDate = new Date(qrs[0].trial_expires_at).toLocaleDateString('es-AR');

            await resend.emails.send({
              from: 'QRapido <onboarding@resend.dev>',
              to: [profile.email],
              subject: '⚠️ Tus códigos QR están por expirar',
              html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h1 style="color: #1a1a1a; font-size: 24px;">Hola${profile.full_name ? ` ${profile.full_name}` : ''}!</h1>
                  
                  <p style="color: #666; font-size: 16px; line-height: 1.6;">
                    Te escribimos para avisarte que ${qrs.length > 1 ? 'tus códigos QR van' : 'tu código QR va'} a expirar pronto.
                  </p>
                  
                  <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 20px 0;">
                    <p style="margin: 0; color: #333; font-weight: 600;">
                      ${qrs.length > 1 ? 'Códigos QR' : 'Código QR'}: ${qrNames}
                    </p>
                    <p style="margin: 8px 0 0; color: #666;">
                      Fecha de expiración: ${expirationDate}
                    </p>
                  </div>
                  
                  <p style="color: #666; font-size: 16px; line-height: 1.6;">
                    Después de esta fecha, ${qrs.length > 1 ? 'estos QRs dejarán' : 'este QR dejará'} de funcionar y las personas que lo escaneen no podrán acceder al enlace.
                  </p>
                  
                  <p style="color: #666; font-size: 16px; line-height: 1.6;">
                    <strong>¿Querés mantener${qrs.length > 1 ? 'los' : 'lo'} activo${qrs.length > 1 ? 's' : ''}?</strong> Elegí un plan de suscripción para que ${qrs.length > 1 ? 'sigan' : 'siga'} funcionando sin interrupciones.
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

            console.log(`Email sent to ${profile.email} for ${qrs.length} QRs`);
            notifiedCount += qrs.length;

            // Log email sent
            await supabase
              .from('email_logs')
              .insert({
                user_id: userId,
                email_type: 'trial_expiration_notice',
                metadata: { qr_ids: qrs.map(q => q.id), qr_names: qrs.map(q => q.name) }
              });

          } catch (emailError) {
            console.error(`Error sending email to ${profile.email}:`, emailError);
          }
        }

        // Mark QRs as notified
        await supabase
          .from('qr_codes')
          .update({ trial_notice_sent: true, updated_at: now })
          .in('id', qrs.map(q => q.id));
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
