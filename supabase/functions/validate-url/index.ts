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
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return new Response(
        JSON.stringify({ reachable: false, error: "URL requerida" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Basic URL format validation
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return new Response(
        JSON.stringify({ reachable: false, error: "Formato de URL inválido" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only allow http/https
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return new Response(
        JSON.stringify({ reachable: false, error: "Solo se permiten URLs HTTP/HTTPS" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try HEAD first, fallback to GET with abort
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    let status: number;
    let ok: boolean;

    try {
      const response = await fetch(parsedUrl.toString(), {
        method: "HEAD",
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "User-Agent": "CreatuQR-URLValidator/1.0",
        },
      });
      status = response.status;
      ok = response.ok;
    } catch (headError) {
      // Some servers reject HEAD, try GET
      try {
        const controller2 = new AbortController();
        const timeout2 = setTimeout(() => controller2.abort(), 8000);
        const response = await fetch(parsedUrl.toString(), {
          method: "GET",
          signal: controller2.signal,
          redirect: "follow",
          headers: {
            "User-Agent": "CreatuQR-URLValidator/1.0",
          },
        });
        clearTimeout(timeout2);
        status = response.status;
        ok = response.ok;
        // Consume and discard body
        await response.body?.cancel();
      } catch {
        clearTimeout(timeout);
        return new Response(
          JSON.stringify({ reachable: false, status: 0, error: "No se pudo conectar con el servidor" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } finally {
      clearTimeout(timeout);
    }

    return new Response(
      JSON.stringify({ reachable: ok, status }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[validate-url] Error:", error);
    return new Response(
      JSON.stringify({ reachable: false, error: "Error interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
