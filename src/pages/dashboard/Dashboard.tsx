import { useState, useEffect, useRef, useMemo } from "react";
import { QrCode, Plus, Search, Download, MoreVertical, Eye, Pencil, Trash2, Link as LinkIcon, ExternalLink, BarChart3, Palette } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { StyledQRCode, type QRDotStyle } from "@/components/dashboard/StyledQRCode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import { useQRCodes, useCreateQR, useDeleteQR, QR_LIMIT } from "@/hooks/useQRCodes";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DownloadQRDialog } from "@/components/dashboard/DownloadQRDialog";
import { useSubscription } from "@/hooks/useSubscription";
import { AlertTriangle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { QRCode as QRCodeType } from "@/hooks/useQRCodes";
const statusColors: Record<string, string> = {
  trial_active: "bg-warning/10 text-warning border-warning/30",
  active: "bg-success/10 text-success border-success/30",
  paused: "bg-muted text-muted-foreground border-border",
  expired: "bg-destructive/10 text-destructive border-destructive/30",
};

const statusLabels: Record<string, string> = {
  trial_active: "Trial",
  active: "Activo",
  paused: "Pausado",
  expired: "Vencido",
};

function QRPreviewImage({ slug, color, dotStyle, size = 140 }: { slug: string; color: string; dotStyle?: string; size?: number }) {
  const baseUrl = window.location.origin;
  const url = `${baseUrl}/r/${slug}`;
  return (
    <div className="w-full h-full flex items-center justify-center">
      <StyledQRCode url={url} color={color || "#000000"} dotStyle={(dotStyle || "square") as QRDotStyle} size={size} />
    </div>
  );
}

function TrialBanner() {
  const { data: subscription } = useSubscription();
  
  // Show banner only if no active subscription
  if (subscription?.status === "active") return null;

  return (
    <div className="mb-6 rounded-xl border border-warning/30 bg-warning/5 p-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
        <p className="text-sm font-medium text-foreground">
          Suscribite al <span className="font-bold">Plan Pro</span> con Mercado Pago para mantener tus QRs activos.
        </p>
      </div>
      <Button variant="outline" size="sm" className="border-warning/50 text-warning hover:bg-warning/10 shrink-0" asChild>
        <Link to="/dashboard/billing">Suscribirme</Link>
      </Button>
    </div>
  );
}

export default function Dashboard() {
  const { data: qrCodes, isLoading: loadingQRs } = useQRCodes();
  const createQR = useCreateQR();
  const deleteQR = useDeleteQR();
  const navigate = useNavigate();
  const pendingProcessed = useRef(false);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [downloadDialog, setDownloadDialog] = useState<{
    open: boolean;
    url: string;
    color: string;
    dotStyle: string;
    name: string;
  }>({ open: false, url: "", color: "#000000", dotStyle: "square", name: "" });

  // Auto-create QR from pending sessionStorage data (landing -> auth -> dashboard flow)
  useEffect(() => {
    if (pendingProcessed.current) return;
    const pendingUrl = sessionStorage.getItem("pending_qr_url");
    if (!pendingUrl) return;

    pendingProcessed.current = true;

    const pendingColor = sessionStorage.getItem("pending_qr_color") || "#000000";
    const utmSource = sessionStorage.getItem("pending_qr_utm_source") || undefined;
    const utmMedium = sessionStorage.getItem("pending_qr_utm_medium") || undefined;
    const utmCampaign = sessionStorage.getItem("pending_qr_utm_campaign") || undefined;

    sessionStorage.removeItem("pending_qr_url");
    sessionStorage.removeItem("pending_qr_color");
    sessionStorage.removeItem("pending_qr_utm_source");
    sessionStorage.removeItem("pending_qr_utm_medium");
    sessionStorage.removeItem("pending_qr_utm_campaign");

    let name = "QR - Mi sitio";
    const finalUrl = pendingUrl.startsWith("http") ? pendingUrl : `https://${pendingUrl}`;
    try {
      const parsed = new URL(finalUrl);
      name = `QR - ${parsed.hostname}`;
    } catch {}

    let destinationWithUtm = finalUrl;
    try {
      const urlObj = new URL(finalUrl);
      if (utmSource) urlObj.searchParams.set("utm_source", utmSource);
      if (utmMedium) urlObj.searchParams.set("utm_medium", utmMedium);
      if (utmCampaign) urlObj.searchParams.set("utm_campaign", utmCampaign);
      destinationWithUtm = urlObj.toString();
    } catch {}

    createQR.mutateAsync({
      name,
      destination_url: finalUrl,
      color: pendingColor,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
    }).then(() => {
      setDownloadDialog({
        open: true,
        url: destinationWithUtm,
        color: pendingColor,
        dotStyle: "square",
        name,
      });
    }).catch(() => {});
  }, []);

  const filteredAndSorted = useMemo(() => {
    if (!qrCodes) return [];
    let result = qrCodes.filter((qr) =>
      qr.name.toLowerCase().includes(search.toLowerCase()) ||
      qr.destination_url.toLowerCase().includes(search.toLowerCase())
    );
    switch (sortBy) {
      case "newest":
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "oldest":
        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case "most_scans":
        result.sort((a, b) => b.total_scans_cached - a.total_scans_cached);
        break;
      case "name":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
    return result;
  }, [qrCodes, search, sortBy]);

  const activeCount = qrCodes?.length || 0;
  const isAtLimit = activeCount >= QR_LIMIT;

  return (
    <div className="space-y-6">
      <DownloadQRDialog
        open={downloadDialog.open}
        onOpenChange={(open) => setDownloadDialog((prev) => ({ ...prev, open }))}
        destinationUrl={downloadDialog.url}
        color={downloadDialog.color}
        dotStyle={(downloadDialog.dotStyle || "square") as QRDotStyle}
        fileName={downloadDialog.name}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Mover a papelera?</AlertDialogTitle>
            <AlertDialogDescription>
              El QR dejará de funcionar. Podés restaurarlo durante los próximos 7 días.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) deleteQR.mutate(deleteId);
                setDeleteId(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TrialBanner />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-3">
            <QrCode className="w-7 h-7" />
            Códigos QR
          </h1>
          <Badge variant="outline" className="text-xs font-medium">
            {activeCount} de {QR_LIMIT} usados
          </Badge>
        </div>
        {isAtLimit ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button variant="hero" disabled>
                  <Plus className="w-4 h-4" />
                  Crear código QR
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Eliminá un QR existente para crear uno nuevo.</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <Button variant="hero" asChild>
            <Link to="/dashboard/create">
              <Plus className="w-4 h-4" />
              Crear código QR
            </Link>
          </Button>
        )}
      </div>

      {/* Search & Sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar código QR..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Último creado</SelectItem>
            <SelectItem value="oldest">Más antiguo</SelectItem>
            <SelectItem value="most_scans">Más escaneos</SelectItem>
            <SelectItem value="name">Nombre A-Z</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* QR Cards Grid */}
      {loadingQRs ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-card rounded-xl border p-6">
              <div className="flex gap-6">
                <Skeleton className="w-36 h-36 rounded-lg shrink-0" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !qrCodes || qrCodes.length === 0 ? (
        <div className="bg-card rounded-xl border p-12 text-center">
          <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-6 shadow-lg">
            <QrCode className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Creá tu primer QR
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            Empezá a trackear escaneos y optimizar tus campañas con QRs dinámicos.
          </p>
          <Button variant="hero" size="lg" asChild>
            <Link to="/dashboard/create">Crear QR ahora</Link>
          </Button>
        </div>
      ) : filteredAndSorted.length === 0 ? (
        <div className="bg-card rounded-xl border p-8 text-center">
          <Search className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No se encontraron QRs con "{search}"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredAndSorted.map((qr) => {
            const shortLink = `qrapido.io/r/${qr.slug}`;
            return (
              <div
                key={qr.id}
                className="bg-card rounded-xl border hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row">
                  {/* Left: QR Preview + Scans + Download */}
                  <div className="sm:border-r p-5 flex flex-col items-center gap-3 sm:w-[200px] shrink-0">
                    <div className="w-36 h-36 rounded-lg overflow-hidden bg-white border">
                      <QRPreviewImage slug={qr.slug} color={qr.color || "#000000"} dotStyle={qr.dot_style} size={144} />
                    </div>
                    <div className="w-full rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 flex items-center justify-center gap-2">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold text-primary">
                        {qr.total_scans_cached} Escaneos
                      </span>
                    </div>
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full"
                      onClick={() =>
                        setDownloadDialog({
                          open: true,
                          url: qr.destination_url,
                          color: qr.color || "#000000",
                          dotStyle: qr.dot_style || "square",
                          name: qr.name,
                        })
                      }
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Descargar
                    </Button>
                  </div>

                  {/* Right: Info */}
                  <div className="flex-1 p-5 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 ${statusColors[qr.status]}`}>
                            {statusLabels[qr.status]}
                          </Badge>
                        </div>
                        <h3 className="font-bold text-lg text-foreground leading-snug truncate" title={qr.name}>
                          {qr.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Actualizado{" "}
                          {new Date(qr.updated_at).toLocaleDateString("es-AR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon" className="h-8 w-8 shrink-0">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/dashboard/qr/${qr.id}`)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteId(qr.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="mt-4 space-y-2.5">
                      <a href={`https://${shortLink}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
                        <LinkIcon className="w-4 h-4 text-primary shrink-0" />
                        <span className="truncate font-medium text-foreground hover:text-primary">{shortLink}</span>
                      </a>
                      <a href={qr.destination_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                        <ExternalLink className="w-4 h-4 text-primary shrink-0" />
                        <span className="truncate">{qr.destination_url}</span>
                      </a>
                      <button
                        onClick={() => navigate(`/dashboard/qr/${qr.id}`)}
                        className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors mt-1"
                      >
                        <Pencil className="w-4 h-4" />
                        Editar contenido
                      </button>
                      <button
                        onClick={() => navigate(`/dashboard/qr/${qr.id}#personalizacion`)}
                        className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                      >
                        <Palette className="w-4 h-4" />
                        Editar color y forma
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
