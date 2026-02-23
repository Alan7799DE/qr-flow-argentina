import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return new Response(
        JSON.stringify({ valid: false, error: "Email requerido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const domain = email.split("@")[1];
    if (!domain) {
      return new Response(
        JSON.stringify({ valid: false, error: "Formato de email inválido" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check MX records via DNS lookup
    try {
      const mxRecords = await Deno.resolveDns(domain, "MX");
      const valid = mxRecords && mxRecords.length > 0;

      return new Response(
        JSON.stringify({ valid }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch {
      // DNS resolution failed — domain doesn't exist or has no MX records
      return new Response(
        JSON.stringify({ valid: false, error: "El dominio del email no acepta correos" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("[validate-email-domain] Error:", error);
    return new Response(
      JSON.stringify({ valid: false, error: "Error interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
