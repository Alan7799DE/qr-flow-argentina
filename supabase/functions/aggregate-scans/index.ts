import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyCronAuth } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const bearerToken = authHeader?.replace("Bearer ", "");

    if (!verifyCronAuth(bearerToken)) {
      console.error("[aggregate-scans] Unauthorized request");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    console.log(`[aggregate-scans] Aggregating scans before ${todayISO}`);

    // 1. Group scan events by qr_code_id and date (only completed days)
    const { data: scans, error: scanError } = await supabase
      .from("qr_scan_events")
      .select("id, qr_code_id, scanned_at")
      .lt("scanned_at", todayISO);

    if (scanError) {
      console.error("[aggregate-scans] Error fetching scans:", scanError);
      throw scanError;
    }

    if (!scans || scans.length === 0) {
      console.log("[aggregate-scans] No scans to aggregate");
      return new Response(JSON.stringify({ message: "No scans to aggregate", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[aggregate-scans] Found ${scans.length} scan events to aggregate`);

    // Group by qr_code_id + date
    const grouped = new Map<string, { qr_code_id: string; scan_date: string; count: number }>();
    const scanIds: string[] = [];

    for (const scan of scans) {
      scanIds.push(scan.id);
      const dateStr = new Date(scan.scanned_at).toISOString().split("T")[0];
      const key = `${scan.qr_code_id}_${dateStr}`;
      if (grouped.has(key)) {
        grouped.get(key)!.count++;
      } else {
        grouped.set(key, { qr_code_id: scan.qr_code_id, scan_date: dateStr, count: 1 });
      }
    }

    // 2. Upsert into qr_daily_stats
    const upsertRows = Array.from(grouped.values()).map((g) => ({
      qr_code_id: g.qr_code_id,
      scan_date: g.scan_date,
      scan_count: g.count,
    }));

    // Batch upsert - for each row, upsert individually to handle ON CONFLICT with increment
    for (const row of upsertRows) {
      const { error: upsertError } = await supabase.rpc("upsert_daily_stat", {
        _qr_code_id: row.qr_code_id,
        _scan_date: row.scan_date,
        _scan_count: row.scan_count,
      });

      if (upsertError) {
        // Fallback: try direct upsert
        console.log(`[aggregate-scans] RPC failed, using direct upsert for ${row.qr_code_id}/${row.scan_date}`);
        
        // Check if exists
        const { data: existing } = await supabase
          .from("qr_daily_stats")
          .select("id, scan_count")
          .eq("qr_code_id", row.qr_code_id)
          .eq("scan_date", row.scan_date)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("qr_daily_stats")
            .update({ scan_count: existing.scan_count + row.scan_count })
            .eq("id", existing.id);
        } else {
          await supabase
            .from("qr_daily_stats")
            .insert(row);
        }
      }
    }

    console.log(`[aggregate-scans] Upserted ${upsertRows.length} daily stat rows`);

    // 3. Recalculate total_scans_cached for affected QR codes
    const affectedQRIds = [...new Set(scans.map((s) => s.qr_code_id))];

    for (const qrId of affectedQRIds) {
      const { data: statsSum } = await supabase
        .from("qr_daily_stats")
        .select("scan_count")
        .eq("qr_code_id", qrId);

      const total = statsSum?.reduce((sum, row) => sum + row.scan_count, 0) || 0;

      // Get the latest scan date for last_scan_at
      const { data: latestStat } = await supabase
        .from("qr_daily_stats")
        .select("scan_date")
        .eq("qr_code_id", qrId)
        .order("scan_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      await supabase
        .from("qr_codes")
        .update({
          total_scans_cached: total,
          last_scan_at: latestStat ? `${latestStat.scan_date}T23:59:59Z` : null,
        })
        .eq("id", qrId);
    }

    console.log(`[aggregate-scans] Updated cache for ${affectedQRIds.length} QR codes`);

    // 4. Delete processed scan events in batches
    const batchSize = 500;
    for (let i = 0; i < scanIds.length; i += batchSize) {
      const batch = scanIds.slice(i, i + batchSize);
      const { error: deleteError } = await supabase
        .from("qr_scan_events")
        .delete()
        .in("id", batch);

      if (deleteError) {
        console.error(`[aggregate-scans] Error deleting batch ${i}:`, deleteError);
      }
    }

    console.log(`[aggregate-scans] Deleted ${scanIds.length} processed scan events`);

    return new Response(
      JSON.stringify({
        message: "Aggregation complete",
        processed: scans.length,
        dailyRows: upsertRows.length,
        qrCodesUpdated: affectedQRIds.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[aggregate-scans] Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
