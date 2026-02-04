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

export interface AdminUserWithQRCount extends AdminUser {
  qr_count: number;
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin-users"],
    queryFn: async (): Promise<AdminUserWithQRCount[]> => {
      // Server-side admin verification and data retrieval via edge function
      const { data, error } = await supabase.functions.invoke('admin-users');

      if (error) {
        console.error("Error fetching admin users:", error);
        throw new Error("Failed to fetch user data");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data.users || [];
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
