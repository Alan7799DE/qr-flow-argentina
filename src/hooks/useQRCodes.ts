import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface QRCode {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  destination_url: string;
  status: "trial_active" | "active" | "paused" | "expired";
  color: string;
  logo_url: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  trial_notice_at: string | null;
  trial_expires_at: string | null;
  trial_notice_sent: boolean;
  total_scans_cached: number;
  last_scan_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateQRData {
  name: string;
  destination_url: string;
  color?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

export interface UpdateQRData {
  id: string;
  name?: string;
  destination_url?: string;
  color?: string;
  status?: QRCode["status"];
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
}

// Generate a URL-friendly slug
function generateSlug(name: string): string {
  const normalized = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 30);
  
  const random = Math.random().toString(36).substring(2, 8);
  return `${normalized}-${random}`;
}

export function useQRCodes() {
  return useQuery({
    queryKey: ["qr-codes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("qr_codes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as QRCode[];
    },
  });
}

export function useQRCode(id: string) {
  return useQuery({
    queryKey: ["qr-codes", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("qr_codes")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as QRCode | null;
    },
    enabled: !!id,
  });
}

export function useCreateQR() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateQRData) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user logged in");

      // Get app config for trial settings
      const { data: config } = await supabase
        .from("app_config")
        .select("trial_notice_days, trial_expire_days")
        .eq("id", 1)
        .maybeSingle();

      const trialNoticeDays = config?.trial_notice_days ?? 1;
      const trialExpireDays = config?.trial_expire_days ?? 8;

      const now = new Date();
      const trialNoticeAt = new Date(now.getTime() + trialNoticeDays * 24 * 60 * 60 * 1000);
      const trialExpiresAt = new Date(now.getTime() + trialExpireDays * 24 * 60 * 60 * 1000);

      // Generate unique slug
      let slug = generateSlug(data.name);
      let attempts = 0;
      
      while (attempts < 5) {
        const { data: existing } = await supabase
          .from("qr_codes")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();
        
        if (!existing) break;
        slug = generateSlug(data.name);
        attempts++;
      }

      const { data: qr, error } = await supabase
        .from("qr_codes")
        .insert({
          user_id: user.id,
          name: data.name,
          slug,
          destination_url: data.destination_url,
          color: data.color || "#000000",
          utm_source: data.utm_source || null,
          utm_medium: data.utm_medium || null,
          utm_campaign: data.utm_campaign || null,
          utm_term: data.utm_term || null,
          utm_content: data.utm_content || null,
          trial_notice_at: trialNoticeAt.toISOString(),
          trial_expires_at: trialExpiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return qr as QRCode;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qr-codes"] });
      toast({
        title: "¡QR creado!",
        description: "Tu código QR fue creado exitosamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error al crear QR",
        description: error.message,
      });
    },
  });
}

export function useUpdateQR() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateQRData) => {
      const { data: qr, error } = await supabase
        .from("qr_codes")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return qr as QRCode;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["qr-codes"] });
      queryClient.invalidateQueries({ queryKey: ["qr-codes", data.id] });
      toast({
        title: "QR actualizado",
        description: "Los cambios fueron guardados.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error al actualizar",
        description: error.message,
      });
    },
  });
}

export function useDeleteQR() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("qr_codes")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qr-codes"] });
      toast({
        title: "QR eliminado",
        description: "El código QR fue eliminado.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error al eliminar",
        description: error.message,
      });
    },
  });
}

export function useRegenerateSlug() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      let slug = generateSlug(name);
      let attempts = 0;
      
      while (attempts < 5) {
        const { data: existing } = await supabase
          .from("qr_codes")
          .select("id")
          .eq("slug", slug)
          .neq("id", id)
          .maybeSingle();
        
        if (!existing) break;
        slug = generateSlug(name);
        attempts++;
      }

      const { data: qr, error } = await supabase
        .from("qr_codes")
        .update({ slug })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return qr as QRCode;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["qr-codes"] });
      queryClient.invalidateQueries({ queryKey: ["qr-codes", data.id] });
      toast({
        title: "Slug regenerado",
        description: `Nuevo slug: ${data.slug}`,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });
}
