import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useIsAdmin() {
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
    staleTime: 1000 * 60 * 2,
  });

  const userId = session?.user?.id;

  return useQuery({
    queryKey: ["is-admin", userId],
    queryFn: async () => {
      try {
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
    enabled: !!userId && !sessionLoading,
    staleTime: 1000 * 60 * 5,
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

export interface AdminUsersMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminUsersResponse {
  users: AdminUserWithQRCount[];
  meta: AdminUsersMeta;
}

export function useAdminUsers(params: { page?: number; limit?: number; search?: string } = {}) {
  const { page = 1, limit = 50, search = "" } = params;

  return useQuery({
    queryKey: ["admin-users", page, limit, search],
    queryFn: async (): Promise<AdminUsersResponse> => {
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search) queryParams.set("search", search);

      const { data, error } = await supabase.functions.invoke(
        `admin-users?${queryParams.toString()}`
      );

      if (error) {
        console.error("Error fetching admin users:", error);
        throw new Error("Failed to fetch user data");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return {
        users: data.users || [],
        meta: data.meta || { total: 0, page: 1, limit: 50, totalPages: 0 },
      };
    },
    placeholderData: (prev) => prev,
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
