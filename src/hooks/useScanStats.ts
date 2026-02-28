import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ScanStats {
  last7d: number;
  last14d: number;
  last30d: number;
  total: number;
  dailyScans: { date: string; count: number }[];
}

export function useScanStats(qrCodeId: string) {
  return useQuery({
    queryKey: ["scan-stats", qrCodeId],
    queryFn: async (): Promise<ScanStats> => {
      const now = new Date();
      const day7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const day14 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const day30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Read from qr_daily_stats for last 30 days
      const { data: dailyStats, error } = await supabase
        .from("qr_daily_stats")
        .select("scan_date, scan_count")
        .eq("qr_code_id", qrCodeId)
        .gte("scan_date", day30.toISOString().split("T")[0])
        .order("scan_date", { ascending: true });

      if (error) throw error;

      // Calculate period totals from daily stats
      const day7Str = day7.toISOString().split("T")[0];
      const day14Str = day14.toISOString().split("T")[0];

      let last7d = 0;
      let last14d = 0;
      let last30d = 0;

      dailyStats?.forEach((s) => {
        last30d += s.scan_count;
        if (s.scan_date >= day14Str) last14d += s.scan_count;
        if (s.scan_date >= day7Str) last7d += s.scan_count;
      });

      // Get total from cached value
      const { data: qr } = await supabase
        .from("qr_codes")
        .select("total_scans_cached")
        .eq("id", qrCodeId)
        .maybeSingle();

      // Build daily chart data (fill missing days with 0)
      const dailyMap = new Map<string, number>();
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        dailyMap.set(date.toISOString().split("T")[0], 0);
      }

      dailyStats?.forEach((stat) => {
        if (dailyMap.has(stat.scan_date)) {
          dailyMap.set(stat.scan_date, stat.scan_count);
        }
      });

      const dailyScans = Array.from(dailyMap.entries()).map(([date, count]) => ({
        date,
        count,
      }));

      return {
        last7d,
        last14d,
        last30d,
        total: qr?.total_scans_cached || last30d,
        dailyScans,
      };
    },
    enabled: !!qrCodeId,
    staleTime: 1000 * 60 * 60, // 1 hour (data updates daily)
  });
}

export function useAllQRStats() {
  return useQuery({
    queryKey: ["all-qr-stats"],
    queryFn: async () => {
      // Get user's QR codes with cached stats
      const { data: qrs, error: qrError } = await supabase
        .from("qr_codes")
        .select("id, total_scans_cached, status");

      if (qrError) throw qrError;

      if (!qrs || qrs.length === 0) {
        return {
          activeQRs: 0,
          totalScans: 0,
          nextExpiry: null,
        };
      }

      const totalScans = qrs.reduce((sum, q) => sum + (q.total_scans_cached || 0), 0);

      // Get account-level trial expiry
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
          if (expiryDate > new Date()) {
            nextExpiry = expiryDate.toLocaleDateString("es-AR");
          }
        }
      }

      return {
        activeQRs: qrs.filter((q) => q.status === "active" || q.status === "trial_active").length,
        totalScans,
        nextExpiry,
      };
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}
