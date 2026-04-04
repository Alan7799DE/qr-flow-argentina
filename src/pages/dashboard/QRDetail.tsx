import { useState, useEffect, useRef } from "react";
import { validateDestinationUrl } from "@/lib/validateDestinationUrl";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  QrCode, 
  Link2, 
  ArrowLeft, 
  Loader2, 
  Download, 
  Trash2,
  Pause,
  Play,
  Copy,
  Check,
  ExternalLink,
  Save
} from "lucide-react";
import { useQRCode, useUpdateQR, useDeleteQR } from "@/hooks/useQRCodes";

import { useValidateUrl } from "@/hooks/useValidateUrl";

import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { StyledQRCode, type QRDotStyle } from "@/components/dashboard/StyledQRCode";
import { DotStyleSelector } from "@/components/dashboard/DotStyleSelector";
import { downloadStyledQR } from "@/components/dashboard/StyledQRCode";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const statusColors = {
  trial_active: "bg-warning/10 text-warning border-warning/20",
  active: "bg-success/10 text-success border-success/20",
  paused: "bg-muted text-muted-foreground",
  expired: "bg-destructive/10 text-destructive border-destructive/20",
};

const statusLabels = {
  trial_active: "Trial",
  active: "Activo",
  paused: "Pausado",
  expired: "Vencido",
};

const PRESET_COLORS = [
  { value: "#000000", label: "Negro" },
  { value: "#2563eb", label: "Azul" },
  { value: "#dc2626", label: "Rojo" },
  { value: "#16a34a", label: "Verde" },
  { value: "#7c3aed", label: "Violeta" },
];

function AccountTrialBanner() {
  const { data: profile } = useQuery({
    queryKey: ["account-trial"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("trial_expires_at")
        .eq("user_id", user.id)
        .single();
      return data;
    },
  });

  if (!profile?.trial_expires_at) return null;
  const expiryDate = new Date(profile.trial_expires_at as string);
  if (expiryDate <= new Date()) return null;

  return (
    <div className="bg-warning/10 border border-warning/20 rounded-xl p-4">
      <p className="text-sm text-warning font-medium">
        ⏳ Tu período de prueba vence el {expiryDate.toLocaleDateString("es-AR")}
      </p>
      <p className="text-sm text-warning/80 mt-1">
        Suscribite al <span className="font-bold">Plan Pro</span> para mantener tus QRs activos.
      </p>
      <Button variant="default" size="sm" className="mt-3" asChild>
        <Link to="/dashboard/billing">Suscribirme</Link>
      </Button>
    </div>
  );
}

function useCanActivateQR() {
  return useQuery({
    queryKey: ["can-activate-qr"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const [{ data: profile }, { data: subscription }] = await Promise.all([
        supabase.from("profiles").select("trial_expires_at").eq("user_id", user.id).single(),
        supabase.from("subscriptions").select("status").eq("user_id", user.id).eq("status", "active").maybeSingle(),
      ]);

      const hasActiveTrial = profile?.trial_expires_at && new Date(profile.trial_expires_at) > new Date();
      return !!(hasActiveTrial || subscription);
    },
    staleTime: 1000 * 60 * 2,
  });
}

export default function QRDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const customizationRef = useRef<HTMLDivElement>(null);

  const { data: canActivate, isLoading: isCanActivateLoading } = useCanActivateQR();

  const { data: qr, isLoading } = useQRCode(id || "");
  
  const updateQR = useUpdateQR();
  const deleteQR = useDeleteQR();
  
  const { validate: checkUrlReachability, isValidating: isValidatingUrl } = useValidateUrl();

  const [destinationUrl, setDestinationUrl] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Customization state
  const [editColor, setEditColor] = useState("#000000");
  const [editDotStyle, setEditDotStyle] = useState<QRDotStyle>("square");
  const [hasCustomizationChanges, setHasCustomizationChanges] = useState(false);

  const publicUrl = "https://qrapido.io";
  const redirectUrl = qr ? `${publicUrl}/r/${qr.slug}` : "";

  useEffect(() => {
    if (qr) {
      setDestinationUrl(qr.destination_url);
      setEditColor(qr.color || "#000000");
      setEditDotStyle((qr.dot_style || "square") as QRDotStyle);
    }
  }, [qr]);

  // Scroll to customization section if hash is present
  useEffect(() => {
    if (location.hash === "#personalizacion" && customizationRef.current) {
      setTimeout(() => {
        customizationRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    }
  }, [location.hash, qr]);

  const handleCustomizationChange = (color: string, dotStyle: QRDotStyle) => {
    setEditColor(color);
    setEditDotStyle(dotStyle);
    setHasCustomizationChanges(
      color !== (qr?.color || "#000000") || dotStyle !== ((qr?.dot_style || "square") as QRDotStyle)
    );
  };

  const handleSaveCustomization = async () => {
    if (!qr) return;
    await updateQR.mutateAsync({
      id: qr.id,
      color: editColor,
      dot_style: editDotStyle,
      expected_updated_at: qr.updated_at,
    });
    setHasCustomizationChanges(false);
  };

  const [urlError, setUrlError] = useState("");

  const urlValidation = validateDestinationUrl(destinationUrl);

  const handleSaveUrl = async () => {
    if (!qr) return;
    if (!urlValidation.valid) {
      setUrlError((urlValidation as { valid: false; error: string }).error);
      return;
    }
    const finalUrl = urlValidation.url;
    setUrlError("");

    const urlCheck = await checkUrlReachability(finalUrl);
    if (urlCheck && !urlCheck.reachable) {
      toast({
        variant: "destructive",
        title: "Advertencia: URL posiblemente inaccesible",
        description: urlCheck.status
          ? `La URL respondió con código ${urlCheck.status}. Verificá que sea correcta.`
          : urlCheck.error || "No se pudo verificar la URL de destino.",
      });
    }
    
    await updateQR.mutateAsync({ id: qr.id, destination_url: finalUrl, expected_updated_at: qr.updated_at });
    setDestinationUrl(finalUrl);
    setIsEditing(false);
  };

  const handleTogglePause = async () => {
    if (!qr) return;
    if (qr.status === "paused") {
      if (!canActivate) {
        toast({
          variant: "destructive",
          title: "Suscripción requerida",
          description: "Necesitás una suscripción activa para reactivar este QR. Andá a Facturación para suscribirte.",
        });
        return;
      }
      await updateQR.mutateAsync({ id: qr.id, status: "active", expected_updated_at: qr.updated_at });
    } else {
      await updateQR.mutateAsync({ id: qr.id, status: "paused", expected_updated_at: qr.updated_at });
    }
  };


  const handleDelete = async () => {
    if (!qr) return;
    await deleteQR.mutateAsync(qr.id);
    navigate("/dashboard");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(redirectUrl);
    setCopied(true);
    toast({ title: "URL copiada" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async (format: "png" | "svg") => {
    if (!qr) return;
    await downloadStyledQR({
      url: redirectUrl,
      color: editColor,
      dotStyle: editDotStyle,
      format,
      fileName: qr.slug,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!qr) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">QR no encontrado</p>
        <Button variant="ghost" asChild className="mt-4">
          <Link to="/dashboard">Volver al dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild aria-label="Volver al dashboard">
          <Link to="/dashboard">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{qr.name}</h1>
            <Badge className={statusColors[qr.status]}>
              {statusLabels[qr.status]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Creado el {new Date(qr.created_at).toLocaleDateString("es-AR")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - QR and Actions */}
        <div className="space-y-6">
          {/* QR Preview */}
          <div className="bg-card rounded-xl border p-6">
            <div className="max-w-[250px] mx-auto flex items-center justify-center">
              <StyledQRCode
                url={redirectUrl}
                color={editColor}
                dotStyle={editDotStyle}
                size={250}
              />
            </div>

            {/* Download buttons */}
            <div className="flex gap-2 mt-4">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => handleDownload("png")}>
                <Download className="w-4 h-4" />
                PNG
              </Button>
              <Button variant="outline" size="sm" className="flex-1" onClick={() => handleDownload("svg")}>
                <Download className="w-4 h-4" />
                SVG
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-card rounded-xl border p-6 space-y-3">
            <h3 className="font-semibold text-foreground mb-4">Acciones</h3>
            
            {qr.status === "paused" && !canActivate && !isCanActivateLoading ? (
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start opacity-50 cursor-not-allowed"
                  disabled
                >
                  <Play className="w-4 h-4" />Reactivar QR
                </Button>
                <p className="text-xs text-muted-foreground">
                  Necesitás una suscripción activa para reactivar este QR.{" "}
                  <Link to="/dashboard/billing" className="text-primary hover:underline font-medium">
                    Ir a Facturación
                  </Link>
                </p>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleTogglePause}
                disabled={updateQR.isPending || (qr.status === "paused" && isCanActivateLoading)}
              >
                {qr.status === "paused" ? (
                  <><Play className="w-4 h-4" />Reactivar QR</>
                ) : (
                  <><Pause className="w-4 h-4" />Pausar QR</>
                )}
              </Button>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full justify-start">
                  <Trash2 className="w-4 h-4" />
                  Eliminar QR
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Mover este QR a la papelera?</AlertDialogTitle>
                  <AlertDialogDescription>
                    El QR será pausado y movido a la papelera. Podrás restaurarlo dentro de los próximos 7 días.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Mover a papelera</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Right Column - Stats, URL, Customization */}
        <div className="lg:col-span-2 space-y-6">
          {/* Redirect URL */}
          <div className="bg-card rounded-xl border p-6">
            <h3 className="font-semibold text-foreground mb-4">URL del QR</h3>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
              <code className="flex-1 text-sm truncate">{redirectUrl}</code>
              <Button variant="ghost" size="icon" onClick={handleCopy} aria-label="Copiar URL del QR">
                {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" asChild aria-label="Abrir URL del QR en nueva pestaña">
                <a href={redirectUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            </div>
          </div>

          {/* Destination URL */}
          <div className="bg-card rounded-xl border p-6">
            <h3 className="font-semibold text-foreground mb-4">URL de destino</h3>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={destinationUrl}
                  onChange={(e) => {
                    setDestinationUrl(e.target.value);
                    setIsEditing(true);
                    setUrlError("");
                  }}
                  className={`pl-10 ${urlError ? "border-destructive" : ""}`}
                />
              </div>
              {isEditing && (
                <Button onClick={handleSaveUrl} disabled={updateQR.isPending || isValidatingUrl || !urlValidation.valid}>
                  {isValidatingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : updateQR.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}
                </Button>
              )}
            </div>
            {urlError && <p className="text-sm text-destructive mt-2">{urlError}</p>}
          </div>

          {/* Customization Section */}
          <div ref={customizationRef} id="personalizacion" className="bg-card rounded-xl border p-6 space-y-6">
            <h3 className="font-semibold text-foreground">Personalización</h3>

            {/* Color picker */}
            <div className="space-y-2">
              <Label>Color del QR</Label>
              <div className="flex items-center gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => handleCustomizationChange(c.value, editDotStyle)}
                    className={`w-8 h-8 rounded-full border-2 transition-all duration-200 ${
                      editColor === c.value
                        ? "border-primary scale-110 shadow-md"
                        : "border-border hover:scale-105"
                    }`}
                    style={{ backgroundColor: c.value }}
                    aria-label={c.label}
                  />
                ))}
                <div className="relative ml-1">
                  <input
                    type="color"
                    value={editColor}
                    onChange={(e) => handleCustomizationChange(e.target.value, editDotStyle)}
                    className="w-8 h-8 rounded-full cursor-pointer border border-border appearance-none bg-transparent [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0"
                    aria-label="Color personalizado"
                  />
                </div>
                <Input
                  value={editColor}
                  onChange={(e) => handleCustomizationChange(e.target.value, editDotStyle)}
                  className="w-24 h-8 text-xs"
                  placeholder="#000000"
                  aria-label="Código hex"
                />
              </div>
            </div>

            {/* Dot style selector */}
            <DotStyleSelector
              value={editDotStyle}
              onChange={(style) => handleCustomizationChange(editColor, style)}
            />

            {/* Save button */}
            {hasCustomizationChanges && (
              <Button
                onClick={handleSaveCustomization}
                disabled={updateQR.isPending}
                className="w-full sm:w-auto"
              >
                {updateQR.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</>
                ) : (
                  <><Save className="w-4 h-4" />Guardar cambios</>
                )}
              </Button>
            )}
          </div>


          <AccountTrialBanner />
        </div>
      </div>
    </div>
  );
}
