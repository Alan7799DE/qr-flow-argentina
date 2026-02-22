import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ScanEvent {
  id: string;
  qr_code_id: string;
  scanned_at: string;
  user_agent: string | null;
  referer: string | null;
  ip_hash: string | null;
  device_type: string | null;
  os: string | null;
  country: string | null;
  city: string | null;
}

export interface ScanStats {
  last24h: number;
  last7d: number;
  last14d: number;
  last21d: number;
  last30d: number;
  total: number;
  dailyScans: { date: string; count: number }[];
}

export function useScanStats(qrCodeId: string) {
  return useQuery({
    queryKey: ["scan-stats", qrCodeId],
    queryFn: async (): Promise<ScanStats> => {
      const now = new Date();
      const day24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const day7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const day14 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const day21 = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);
      const day30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get all scans for the last 30 days
      const { data: scans, error } = await supabase
        .from("qr_scan_events")
        .select("scanned_at")
        .eq("qr_code_id", qrCodeId)
        .gte("scanned_at", day30.toISOString())
        .order("scanned_at", { ascending: true });

      if (error) throw error;

      // Calculate stats
      const last24h = scans?.filter(s => new Date(s.scanned_at) >= day24h).length || 0;
      const last7d = scans?.filter(s => new Date(s.scanned_at) >= day7).length || 0;
      const last14d = scans?.filter(s => new Date(s.scanned_at) >= day14).length || 0;
      const last21d = scans?.filter(s => new Date(s.scanned_at) >= day21).length || 0;
      const last30d = scans?.length || 0;

      // Get total from cached value
      const { data: qr } = await supabase
        .from("qr_codes")
        .select("total_scans_cached")
        .eq("id", qrCodeId)
        .maybeSingle();

      // Group by day for chart
      const dailyMap = new Map<string, number>();
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        dailyMap.set(dateStr, 0);
      }

      scans?.forEach(scan => {
        const dateStr = new Date(scan.scanned_at).toISOString().split('T')[0];
        if (dailyMap.has(dateStr)) {
          dailyMap.set(dateStr, (dailyMap.get(dateStr) || 0) + 1);
        }
      });

      const dailyScans = Array.from(dailyMap.entries()).map(([date, count]) => ({
        date,
        count,
      }));

      return {
        last24h,
        last7d,
        last14d,
        last21d,
        last30d,
        total: qr?.total_scans_cached || last30d,
        dailyScans,
      };
    },
    enabled: !!qrCodeId,
    staleTime: 60000, // 1 minute
  });
}

export function useAllQRStats() {
  return useQuery({
    queryKey: ["all-qr-stats"],
    queryFn: async () => {
      const now = new Date();
      const day24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const day7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Get user's QR codes
      const { data: qrs, error: qrError } = await supabase
        .from("qr_codes")
        .select("id, total_scans_cached, status");

      if (qrError) throw qrError;

      if (!qrs || qrs.length === 0) {
        return {
          activeQRs: 0,
          scansToday: 0,
          scans7d: 0,
          nextExpiry: null,
        };
      }

      const qrIds = qrs.map(q => q.id);

      // Get scans for all user's QRs
      const { data: scans24h } = await supabase
        .from("qr_scan_events")
        .select("id")
        .in("qr_code_id", qrIds)
        .gte("scanned_at", day24h.toISOString());

      const { data: scans7d } = await supabase
        .from("qr_scan_events")
        .select("id")
        .in("qr_code_id", qrIds)
        .gte("scanned_at", day7.toISOString());

      // Get account-level trial expiry from profile
      const { data: { user } } = await supabase.auth.getUser();
      let nextExpiry: string | null = null;
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("trial_expires_at")
          .eq("user_id", user.id)
          .single();
        
        if (profile?.trial_expires_at) {
          const expiryDate = new Date(profile.trial_expires_at as string);
          if (expiryDate > now) {
            nextExpiry = expiryDate.toLocaleDateString("es-AR");
          }
        }
      }

      return {
        activeQRs: qrs.filter(q => q.status === "active" || q.status === "trial_active").length,
        scansToday: scans24h?.length || 0,
        scans7d: scans7d?.length || 0,
        nextExpiry,
      };
    },
    staleTime: 60000,
  });
}
