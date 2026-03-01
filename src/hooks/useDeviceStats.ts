import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DeviceStats {
  devices: { label: string; count: number }[];
  operatingSystems: { label: string; count: number }[];
}

export function useDeviceStats(qrCodeId: string) {
  return useQuery({
    queryKey: ["device-stats", qrCodeId],
    queryFn: async (): Promise<DeviceStats> => {
      const { data, error } = await supabase
        .from("qr_scan_events")
        .select("device_type, os")
        .eq("qr_code_id", qrCodeId);

      if (error) throw error;

      const deviceMap = new Map<string, number>();
      const osMap = new Map<string, number>();

      data?.forEach((event) => {
        const device = event.device_type || "Desconocido";
        const os = event.os || "Desconocido";
        deviceMap.set(device, (deviceMap.get(device) || 0) + 1);
        osMap.set(os, (osMap.get(os) || 0) + 1);
      });

      const toSorted = (map: Map<string, number>) =>
        Array.from(map.entries())
          .map(([label, count]) => ({ label, count }))
          .sort((a, b) => b.count - a.count);

      return {
        devices: toSorted(deviceMap),
        operatingSystems: toSorted(osMap),
      };
    },
    enabled: !!qrCodeId,
    staleTime: 1000 * 60 * 60,
  });
}
