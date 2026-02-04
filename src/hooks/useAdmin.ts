import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useIsAdmin() {
  return useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;

      try {
        // Server-side admin verification via edge function
        const { data, error } = await supabase.functions.invoke('verify-admin');

        if (error) {
          console.error("Error verifying admin status:", error);
          return false;
        }

        return data?.isAdmin === true;
      } catch (error) {
        console.error("Error calling verify-admin function:", error);
        return false;
      }
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

export interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  subscription?: {
    id: string;
    status: string;
    plan_id: string;
    current_period_end: string | null;
    plan_name: string | null;
  } | null;
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin-users"],
    queryFn: async (): Promise<AdminUser[]> => {
      // Get profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Get subscriptions with plans
      const { data: subscriptions, error: subsError } = await supabase
        .from("subscriptions")
        .select("*, plans(name)");

      if (subsError) throw subsError;

      // Map subscriptions to users
      const subsMap = new Map(
        subscriptions?.map((sub) => [
          sub.user_id,
          {
            id: sub.id,
            status: sub.status,
            plan_id: sub.plan_id,
            current_period_end: sub.current_period_end,
            plan_name: (sub.plans as { name: string } | null)?.name || null,
          },
        ])
      );

      return profiles.map((profile) => ({
        ...profile,
        subscription: subsMap.get(profile.user_id) || null,
      }));
    },
  });
}

export function useAdminPlans() {
  return useQuery({
    queryKey: ["admin-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data;
    },
  });
}

export function useAppConfig() {
  return useQuery({
    queryKey: ["app-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_config")
        .select("*")
        .single();

      if (error) throw error;
      return data;
    },
  });
}

export function useWebhookLogs() {
  return useQuery({
    queryKey: ["webhook-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhook_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });
}
