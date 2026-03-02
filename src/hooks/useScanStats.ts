import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ScanStats {
  dailyScans: { date: string; count: number }[];
}

export function useScanStats(qrCodeId: string) {
  return useQuery({
    queryKey: ["scan-stats", qrCodeId],
    queryFn: async (): Promise<ScanStats> => {
      const now = new Date();
      const day7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const { data: dailyStats, error } = await supabase
        .from("qr_daily_stats")
        .select("scan_date, scan_count")
        .eq("qr_code_id", qrCodeId)
        .gte("scan_date", day7.toISOString().split("T")[0])
        .order("scan_date", { ascending: true });

      if (error) throw error;

      // Build daily chart data for last 7 days (fill missing days with 0)
      const dailyMap = new Map<string, number>();
      for (let i = 6; i >= 0; i--) {
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

      return { dailyScans };
    },
    enabled: !!qrCodeId,
    staleTime: 1000 * 60 * 60,
  });
}

