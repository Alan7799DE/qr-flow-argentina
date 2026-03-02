import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Plan {
  id: string;
  name: string;
  slug: string;
  price_ars: number;
  qr_limit: number;
  retention_days: number;
  has_logo_customization: boolean;
  has_api_access: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: "active" | "paused" | "cancelled" | "expired";
  mercadopago_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  grace_period_ends_at: string | null;
  created_at: string;
  plan?: Plan;
}

export function usePlans() {
  return useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as Plan[];
    },
  });
}

export function useSubscription() {
  return useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("subscriptions")
        .select("*, plan:plans(*)")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as (Subscription & { plan: Plan }) | null;
    },
  });
}
