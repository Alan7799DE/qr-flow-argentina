import { useState, useEffect } from "react";
import { z } from "zod";
import { useParams, useNavigate, Link } from "react-router-dom";
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
  RefreshCw, 
  Trash2,
  Pause,
  Play,
  Copy,
  Check,
  ExternalLink
} from "lucide-react";
import { useQRCode, useUpdateQR, useDeleteQR, useRegenerateSlug } from "@/hooks/useQRCodes";
import { useValidateUrl } from "@/hooks/useValidateUrl";
import { useScanStats } from "@/hooks/useScanStats";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import QRCodeLib from "qrcode";
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
        Suscribite a un plan para mantener tus QRs activos.
      </p>
      <Button variant="default" size="sm" className="mt-3" asChild>
        <Link to="/dashboard/billing">Ver planes</Link>
      </Button>
    </div>
  );
}

export default function QRDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: qr, isLoading } = useQRCode(id || "");
  const { data: stats, isLoading: loadingStats } = useScanStats(id || "");
  const updateQR = useUpdateQR();
  const deleteQR = useDeleteQR();
  const regenerateSlug = useRegenerateSlug();
  const { validate: checkUrlReachability, isValidating: isValidatingUrl } = useValidateUrl();

  const [destinationUrl, setDestinationUrl] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");

  const publicUrl = "https://creatuqr.lovable.app";
  const redirectUrl = qr ? `${publicUrl}/r/${qr.slug}` : "";

  useEffect(() => {
    if (qr) {
      setDestinationUrl(qr.destination_url);
    }
  }, [qr]);

  useEffect(() => {
    if (redirectUrl) {
      QRCodeLib.toDataURL(redirectUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: qr?.color || "#000000",
          light: "#ffffff",
        },
      }).then(setQrDataUrl);
    }
  }, [redirectUrl, qr?.color]);

  const [urlError, setUrlError] = useState("");

  const handleSaveUrl = async () => {
    if (!qr) return;
    
    const finalUrl = destinationUrl.startsWith("http") ? destinationUrl : `https://${destinationUrl}`;
    const result = z.string().url("Ingresá una URL válida (ej: https://tusitio.com)").safeParse(finalUrl);
    if (!result.success) {
      setUrlError(result.error.errors[0].message);
      return;
    }
    setUrlError("");

    // Validate URL reachability (non-blocking warning)
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
    const newStatus = qr.status === "paused" ? "active" : "paused";
    await updateQR.mutateAsync({ id: qr.id, status: newStatus, expected_updated_at: qr.updated_at });
  };

  const handleRegenerateSlug = async () => {
    if (!qr) return;
    await regenerateSlug.mutateAsync({ id: qr.id, name: qr.name });
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

    if (format === "png") {
      const dataUrl = await QRCodeLib.toDataURL(redirectUrl, {
        width: 1024,
        margin: 4,
        color: { dark: qr.color || "#000000", light: "#ffffff" },
      });
      const link = document.createElement("a");
      link.download = `${qr.slug}.png`;
      link.href = dataUrl;
      link.click();
    } else {
      const svg = await QRCodeLib.toString(redirectUrl, {
        type: "svg",
        margin: 4,
        color: { dark: qr.color || "#000000", light: "#ffffff" },
      });
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const link = document.createElement("a");
      link.download = `${qr.slug}.svg`;
      link.href = URL.createObjectURL(blob);
      link.click();
    }
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
            <div className="aspect-square max-w-[250px] mx-auto bg-white rounded-xl flex items-center justify-center p-4">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt={`Código QR para ${qr.name}`} className="w-full h-full object-contain" />
              ) : (
                <QrCode className="w-16 h-16 text-muted-foreground/50" />
              )}
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
            
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleTogglePause}
              disabled={updateQR.isPending}
            >
              {qr.status === "paused" ? (
                <>
                  <Play className="w-4 h-4" />
                  Reactivar QR
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4" />
                  Pausar QR
                </>
              )}
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleRegenerateSlug}
              disabled={regenerateSlug.isPending}
            >
              <RefreshCw className={`w-4 h-4 ${regenerateSlug.isPending ? "animate-spin" : ""}`} />
              Regenerar slug
            </Button>

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
                    El QR será pausado y movido a la papelera. Podrás restaurarlo dentro de los próximos 7 días. Después de ese plazo se eliminará permanentemente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>
                    Mover a papelera
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Right Column - Stats and URL */}
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
                <Button onClick={handleSaveUrl} disabled={updateQR.isPending || isValidatingUrl}>
                  {isValidatingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : updateQR.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}
                </Button>
              )}
            </div>
            {urlError && (
              <p className="text-sm text-destructive mt-2">{urlError}</p>
            )}
          </div>

          {/* Stats */}
          <div className="bg-card rounded-xl border p-6">
            <h3 className="font-semibold text-foreground mb-4">Escaneos · Últimos 7 días</h3>
            <div className="h-32 rounded-lg bg-muted/30 flex items-end justify-between p-4 gap-1" role="group" aria-label="Gráfico de escaneos diarios">
              {loadingStats ? (
                <Skeleton className="h-full w-full" />
              ) : (
                stats?.dailyScans.map((day, i) => {
                  const maxCount = Math.max(...(stats.dailyScans.map(d => d.count)), 1);
                  const height = (day.count / maxCount) * 100;
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-t bg-primary/60 transition-all hover:bg-primary"
                      style={{ height: `${Math.max(height, 4)}%` }}
                      title={`${day.date}: ${day.count} escaneos`}
                      role="img"
                      aria-label={`${day.date}: ${day.count} escaneos`}
                    />
                  );
                })
              )}
            </div>
            <p className="text-center text-xs text-muted-foreground mt-2">Estadísticas actualizadas diariamente</p>
          </div>

          {/* Trial info - account level */}
          <AccountTrialBanner />
        </div>
      </div>
    </div>
  );
}
