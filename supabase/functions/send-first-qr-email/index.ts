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
      .select('email, full_name')
      .eq('user_id', user.id)
      .single();

    if (!profile?.email) {
      return new Response(
        JSON.stringify({ error: 'No profile found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resend = new Resend(RESEND_API_KEY);

    await resend.emails.send({
      from: 'QRapido <onboarding@resend.dev>',
      to: [profile.email],
      subject: '🎉 ¡Creaste tu primer QR en QRapido!',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1a1a1a; font-size: 24px;">¡Felicitaciones${profile.full_name ? ` ${profile.full_name}` : ''}! 🎉</h1>
          
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            Acabás de crear tu primer código QR dinámico: <strong>${qr_name || 'Tu QR'}</strong>
          </p>
          
          <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0; color: #333; font-weight: 600;">¿Qué podés hacer ahora?</p>
            <ul style="color: #666; font-size: 15px; line-height: 1.8; padding-left: 20px;">
              <li>📊 Seguir las estadísticas de escaneos en tiempo real</li>
              <li>✏️ Editar la URL de destino cuando quieras</li>
              <li>🎨 Personalizar el color de tu QR</li>
              <li>📈 Agregar parámetros UTM para trackear campañas</li>
            </ul>
          </div>
          
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            Tu QR está activo en período de prueba. Para mantenerlo funcionando sin interrupciones, podés elegir un plan en cualquier momento.
          </p>
          
          <a href="https://creatuqr.lovable.app/dashboard" 
             style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; margin: 20px 0;">
            Ir a mi Dashboard
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

    // Log the email
    await serviceClient
      .from('email_logs')
      .insert({
        user_id: user.id,
        email_type: 'first_qr_welcome',
        metadata: { qr_name },
      });

    console.log(`First QR welcome email sent to ${profile.email}`);

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
