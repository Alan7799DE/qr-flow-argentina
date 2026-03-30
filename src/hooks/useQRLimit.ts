import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_QR_LIMIT = 5;

export function useQRLimit() {
  return useQuery({
    queryKey: ["qr-limit"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return DEFAULT_QR_LIMIT;

      const { data, error } = await supabase.rpc("get_user_qr_limit", {
        _user_id: user.id,
      });

      if (error) {
        console.error("Error fetching QR limit:", error);
        return DEFAULT_QR_LIMIT;
      }

      return (data as number) ?? DEFAULT_QR_LIMIT;
    },
  });
}
