import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

// UTM parameter validation schema - alphanumeric, hyphens, underscores, spaces only
// Max 255 characters to match database constraint
const utmParamSchema = z.string()
  .max(255, "Máximo 255 caracteres")
  .regex(/^[a-zA-Z0-9\-_\s]*$/, "Solo se permiten letras, números, guiones, guiones bajos y espacios")
  .optional()
  .nullable()
  .transform(val => val === "" ? null : val);

// Validation function for UTM parameters
export function validateUtmParams(params: {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
}): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  
  const fields = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;
  
  for (const field of fields) {
    const value = params[field];
    if (value) {
      const result = utmParamSchema.safeParse(value);
      if (!result.success) {
        errors[field] = result.error.errors[0].message;
      }
    }
  }
  
  return { valid: Object.keys(errors).length === 0, errors };
}

// Sanitize UTM parameter - remove any potentially dangerous characters
function sanitizeUtmParam(value: string | null | undefined): string | null {
  if (!value) return null;
  // Remove any characters that aren't alphanumeric, hyphens, underscores, or spaces
  const sanitized = value.replace(/[^a-zA-Z0-9\-_\s]/g, '').trim();
  // Truncate to 255 characters
  return sanitized.substring(0, 255) || null;
}

export interface QRCode {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  destination_url: string;
  status: "trial_active" | "active" | "paused" | "expired";
  color: string;
  dot_style: string;
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
  deleted_at: string | null;
}

export interface CreateQRData {
  name: string;
  destination_url: string;
  color?: string;
  dot_style?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

export interface UpdateQRData {
  id: string;
  expected_updated_at?: string;
  name?: string;
  destination_url?: string;
  color?: string;
  dot_style?: string;
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user logged in");

      const { data, error } = await supabase
        .from("qr_codes")
        .select("*")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as QRCode[];
    },
  });
}

export function useDeletedQRCodes() {
  return useQuery({
    queryKey: ["qr-codes-deleted"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user logged in");

      const { data, error } = await supabase
        .from("qr_codes")
        .select("*")
        .eq("user_id", user.id)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });

      if (error) throw error;
      return (data as QRCode[]).filter((qr) => {
        const deletedAt = new Date(qr.deleted_at!);
        const sevenDaysLater = new Date(deletedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
        return new Date() < sevenDaysLater;
      });
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

      // Check subscription or trial status
      const { data: profile } = await supabase
        .from("profiles")
        .select("trial_started_at, trial_expires_at")
        .eq("user_id", user.id)
        .single();

      const hasActiveTrial = profile?.trial_expires_at && new Date(profile.trial_expires_at) > new Date();

      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      // Allow creation if: first QR (will start trial), active trial, or active subscription
      const isFirstQR = !profile?.trial_started_at;
      if (!isFirstQR && !hasActiveTrial && !subscription) {
        throw new Error("Necesitás una suscripción activa para crear códigos QR.");
      }

      // Check QR limit (count active QRs, excluding soft-deleted)
      const { count, error: countError } = await supabase
        .from("qr_codes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("deleted_at", null);

      if (countError) throw countError;

      if ((count ?? 0) >= QR_LIMIT) {
        throw new Error("Alcanzaste el límite de 10 QRs activos. Eliminá uno existente para poder crear uno nuevo.");
      }

      let shouldStartTrial = false;

      // If user has no trial yet, start one on first QR creation
      if (!profile?.trial_started_at) {
        shouldStartTrial = true;

        // Get app config for trial settings
        const { data: config } = await supabase
          .from("app_config")
          .select("trial_notice_days, trial_expire_days")
          .eq("id", 1)
          .maybeSingle();

        const trialNoticeDays = config?.trial_notice_days ?? 1;
        const trialExpireDays = config?.trial_expire_days ?? 8;

        const now = new Date();
        const trialNoticeAt = new Date(now.getTime() + (trialExpireDays - trialNoticeDays) * 24 * 60 * 60 * 1000);
        const trialExpiresAt = new Date(now.getTime() + trialExpireDays * 24 * 60 * 60 * 1000);

        // Calculate 48h notice (only if trial is 3+ days)
        const trialNotice48hAt = trialExpireDays >= 3
          ? new Date(trialExpiresAt.getTime() - 2 * 24 * 60 * 60 * 1000)
          : null;

        // Set trial on the profile (account level)
        await supabase
          .from("profiles")
          .update({
            trial_started_at: now.toISOString(),
            trial_expires_at: trialExpiresAt.toISOString(),
            trial_notice_at: trialNoticeAt.toISOString(),
            trial_notice_sent: false,
            trial_notice_48h_at: trialNotice48hAt?.toISOString() ?? null,
            trial_notice_48h_sent: false,
          } as any)
          .eq("user_id", user.id);
      }

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

      // Validate UTM parameters before insert
      const utmValidation = validateUtmParams({
        utm_source: data.utm_source,
        utm_medium: data.utm_medium,
        utm_campaign: data.utm_campaign,
        utm_term: data.utm_term,
        utm_content: data.utm_content,
      });
      
      if (!utmValidation.valid) {
        const firstError = Object.values(utmValidation.errors)[0];
        throw new Error(`Error en parámetros UTM: ${firstError}`);
      }

      const { data: qr, error } = await supabase
        .from("qr_codes")
        .insert({
          user_id: user.id,
          name: data.name,
          slug,
          destination_url: data.destination_url,
          color: data.color || "#000000",
          dot_style: data.dot_style || "square",
          utm_source: sanitizeUtmParam(data.utm_source),
          utm_medium: sanitizeUtmParam(data.utm_medium),
          utm_campaign: sanitizeUtmParam(data.utm_campaign),
          utm_term: sanitizeUtmParam(data.utm_term),
          utm_content: sanitizeUtmParam(data.utm_content),
        })
        .select()
        .single();

      if (error) throw error;
      return { qr: qr as QRCode, isFirstQR: shouldStartTrial };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["qr-codes"] });
      queryClient.invalidateQueries({ queryKey: ["all-qr-stats"] });
      toast({
        title: "¡QR creado!",
        description: "Tu código QR fue creado exitosamente.",
      });

      // Send first QR welcome email only on first QR
      if (result.isFirstQR) {
        supabase.functions.invoke('send-first-qr-email', {
          body: { qr_name: result.qr.name },
        }).then(({ error, data }) => {
          const dataError = (data as { error?: string; details?: string } | null)?.error;
          if (error || dataError) {
            console.error('Welcome email failed:', error?.message || dataError || data);
          }
        }).catch((err) => {
          console.error('Welcome email invocation failed:', err);
        });
      }
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
    mutationFn: async ({ id, expected_updated_at, ...data }: UpdateQRData) => {
      // Validate UTM parameters before update
      const utmValidation = validateUtmParams({
        utm_source: data.utm_source,
        utm_medium: data.utm_medium,
        utm_campaign: data.utm_campaign,
        utm_term: data.utm_term,
        utm_content: data.utm_content,
      });
      
      if (!utmValidation.valid) {
        const firstError = Object.values(utmValidation.errors)[0];
        throw new Error(`Error en parámetros UTM: ${firstError}`);
      }

      // Sanitize UTM params if they exist in the update
      const sanitizedData = { ...data };
      if ('utm_source' in data) sanitizedData.utm_source = sanitizeUtmParam(data.utm_source);
      if ('utm_medium' in data) sanitizedData.utm_medium = sanitizeUtmParam(data.utm_medium);
      if ('utm_campaign' in data) sanitizedData.utm_campaign = sanitizeUtmParam(data.utm_campaign);
      if ('utm_term' in data) sanitizedData.utm_term = sanitizeUtmParam(data.utm_term);
      if ('utm_content' in data) sanitizedData.utm_content = sanitizeUtmParam(data.utm_content);

      let query = supabase
        .from("qr_codes")
        .update(sanitizedData)
        .eq("id", id);

      // Optimistic locking: only update if updated_at matches
      if (expected_updated_at) {
        query = query.eq("updated_at", expected_updated_at);
      }

      const { data: qr, error } = await query.select().single();

      if (error) {
        // If no rows matched, it means the QR was modified by another session
        if (error.code === "PGRST116") {
          throw new Error("Este QR fue modificado en otra sesión. Los datos se recargaron automáticamente.");
        }
        throw error;
      }
      return qr as QRCode;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["qr-codes"] });
      queryClient.invalidateQueries({ queryKey: ["qr-codes", data.id] });
      queryClient.invalidateQueries({ queryKey: ["all-qr-stats"] });
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
      // Soft delete: set deleted_at timestamp and pause the QR
      const { error } = await supabase
        .from("qr_codes")
        .update({ deleted_at: new Date().toISOString(), status: "paused" } as any)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qr-codes"] });
      queryClient.invalidateQueries({ queryKey: ["qr-codes-deleted"] });
      queryClient.invalidateQueries({ queryKey: ["all-qr-stats"] });
      toast({
        title: "QR movido a papelera",
        description: "Podés restaurarlo durante los próximos 7 días.",
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

export function useRestoreQR() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user logged in");

      // Check subscription or trial status
      const [{ data: profile }, { data: subscription }, { count, error: countError }] = await Promise.all([
        supabase
          .from("profiles")
          .select("trial_started_at, trial_expires_at")
          .eq("user_id", user.id)
          .single(),
        supabase
          .from("subscriptions")
          .select("status")
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle(),
        supabase
          .from("qr_codes")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .is("deleted_at", null),
      ]);

      const hasActiveTrial = profile?.trial_expires_at && new Date(profile.trial_expires_at) > new Date();

      if (!hasActiveTrial && !subscription) {
        throw new Error("Necesitás una suscripción activa para restaurar códigos QR.");
      }

      if (countError) throw countError;
      if ((count ?? 0) >= QR_LIMIT) {
        throw new Error("Alcanzaste el límite de 10 QRs activos. Eliminá uno existente para poder restaurar este.");
      }

      const { error } = await supabase
        .from("qr_codes")
        .update({ deleted_at: null } as any)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qr-codes"] });
      queryClient.invalidateQueries({ queryKey: ["qr-codes-deleted"] });
      queryClient.invalidateQueries({ queryKey: ["all-qr-stats"] });
      toast({
        title: "QR restaurado",
        description: "El código QR fue restaurado exitosamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error al restaurar",
        description: error.message,
      });
    },
  });
}

