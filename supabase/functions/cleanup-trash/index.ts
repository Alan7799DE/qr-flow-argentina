import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify cron secret
    const authHeader = req.headers.get("Authorization");
    const cronSecret = Deno.env.get("CRON_SECRET");
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Calculate cutoff: 7 days ago
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // First delete scan events for QRs that will be permanently deleted
    const { data: expiredQRs } = await supabase
      .from("qr_codes")
      .select("id")
      .not("deleted_at", "is", null)
      .lt("deleted_at", cutoff);

    if (expiredQRs && expiredQRs.length > 0) {
      const ids = expiredQRs.map((qr: { id: string }) => qr.id);
      
      const { error: scanError } = await supabase
        .from("qr_scan_events")
        .delete()
        .in("qr_code_id", ids);

      if (scanError) {
        console.error("Error deleting scan events:", scanError);
      }

      // Permanently delete the QR codes
      const { error: deleteError, count } = await supabase
        .from("qr_codes")
        .delete()
        .in("id", ids);

      if (deleteError) {
        console.error("Error deleting QR codes:", deleteError);
        return new Response(
          JSON.stringify({ error: "Error deleting expired QR codes" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Permanently deleted ${ids.length} QR codes from trash`);

      return new Response(
        JSON.stringify({ success: true, deleted: ids.length }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("No expired QR codes to clean up");
    return new Response(
      JSON.stringify({ success: true, deleted: 0 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
