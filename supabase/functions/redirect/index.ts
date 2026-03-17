import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function parseUserAgent(ua: string | null): { deviceType: string; os: string } {
  if (!ua) return { deviceType: "unknown", os: "unknown" };
  const uaLower = ua.toLowerCase();

  let os = "unknown";
  if (uaLower.includes("android")) os = "Android";
  else if (uaLower.includes("iphone") || uaLower.includes("ipad")) os = "iOS";
  else if (uaLower.includes("windows")) os = "Windows";
  else if (uaLower.includes("mac os")) os = "macOS";
  else if (uaLower.includes("linux")) os = "Linux";

  let deviceType = "desktop";
  if (uaLower.includes("mobile") || uaLower.includes("android") || uaLower.includes("iphone")) {
    deviceType = "mobile";
  } else if (uaLower.includes("tablet") || uaLower.includes("ipad")) {
    deviceType = "tablet";
  }

  return { deviceType, os };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const slug = pathParts[pathParts.length - 1];

    if (!slug) {
      return new Response("Missing slug", { status: 400, headers: corsHeaders });
    }

    console.log(`[redirect] Processing slug: ${slug}`);

    const supabase = createClient<any>(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Fetch QR code by slug
      const { data: qr, error: qrError } = await supabase
      .from("qr_codes")
      .select("id, destination_url, status, deleted_at, utm_source, utm_medium, utm_campaign, utm_term, utm_content")
      .eq("slug", slug)
      .maybeSingle();

    if (qrError) {
      console.error("[redirect] Database error:", qrError);
      return new Response("Internal error", { status: 500, headers: corsHeaders });
    }

    if (!qr) {
      console.log(`[redirect] QR not found for slug: ${slug}`);
      return new Response("QR not found", { status: 404, headers: corsHeaders });
    }

    if (qr.deleted_at) {
      console.log(`[redirect] QR soft-deleted for slug: ${slug}`);
      return new Response("QR not found", { status: 404, headers: corsHeaders });
    }

    console.log(`[redirect] QR found: ${qr.id}, status: ${qr.status}`);

    const activateUrl = `https://creatuqr.lovable.app/activate/${slug}`;

    if (qr.status === "paused" || qr.status === "expired") {
      console.log(`[redirect] QR inactive, redirecting to activate page`);
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, "Location": activateUrl },
      });
    }

    // Parse request info
    const rawUserAgent = req.headers.get("user-agent");
    const referer = req.headers.get("referer");

    // Sanitize user-agent: remove control characters, normalize whitespace, truncate
    const sanitizeHeader = (val: string | null, maxLen: number): string | null => {
      if (!val) return null;
      return val.replace(/[\x00-\x1F\x7F]/g, '').replace(/\s+/g, ' ').trim().substring(0, maxLen) || null;
    };

    const userAgent = sanitizeHeader(rawUserAgent, 300);
    const { deviceType, os } = parseUserAgent(rawUserAgent);

    // Record scan
    try {
      const { error: insertError } = await supabase.from("qr_scan_events").insert({
        qr_code_id: qr.id,
        user_agent: userAgent,
        referer: sanitizeHeader(referer, 300),
        device_type: deviceType,
        os: os,
      });

      if (insertError) {
        console.error("[redirect] Error inserting scan event:", insertError);
      } else {
        console.log(`[redirect] Scan recorded for QR: ${qr.id}`);
      }
    } catch (err) {
      console.error("[redirect] Error recording scan:", err);
    }

    // Build final destination URL with UTMs
    let destinationUrl = qr.destination_url;
    try {
      const destUrl = new URL(destinationUrl);
      if (qr.utm_source) destUrl.searchParams.set("utm_source", qr.utm_source);
      if (qr.utm_medium) destUrl.searchParams.set("utm_medium", qr.utm_medium);
      if (qr.utm_campaign) destUrl.searchParams.set("utm_campaign", qr.utm_campaign);
      if (qr.utm_term) destUrl.searchParams.set("utm_term", qr.utm_term);
      if (qr.utm_content) destUrl.searchParams.set("utm_content", qr.utm_content);
      destinationUrl = destUrl.toString();
    } catch {
      console.log("[redirect] Could not parse destination URL for UTM params");
    }

    console.log(`[redirect] Redirecting to: ${destinationUrl}`);

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        "Location": destinationUrl,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("[redirect] Unexpected error:", error);
    return new Response("Internal error", { status: 500, headers: corsHeaders });
  }
});
