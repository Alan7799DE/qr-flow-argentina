import { useState, useEffect, useRef, useMemo } from "react";
import { QrCode, Plus, Search, Download, ExternalLink, MoreVertical, Eye, Pencil, Trash2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import { useQRCodes, useCreateQR, useDeleteQR } from "@/hooks/useQRCodes";
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
import QRCodeLib from "qrcode";

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

function QRPreviewImage({ url, color, size = 140 }: { url: string; color: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    const baseUrl = window.location.origin;
    QRCodeLib.toDataURL(`${baseUrl}/r/${url}`, {
      width: size,
      margin: 1,
      color: { dark: color || "#000000", light: "#ffffff" },
      errorCorrectionLevel: "M",
    }).then(setDataUrl).catch(() => {});
  }, [url, color, size]);

  if (!dataUrl) return <Skeleton className="w-full h-full" />;
  return <img src={dataUrl} alt="QR Code" className="w-full h-full object-contain" />;
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
          Suscribite a un plan para mantener tus QRs activos.
        </p>
      </div>
      <Button variant="outline" size="sm" className="border-warning/50 text-warning hover:bg-warning/10 shrink-0" asChild>
        <Link to="/dashboard/billing">Ver planes</Link>
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
    name: string;
  }>({ open: false, url: "", color: "#000000", name: "" });

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

  const activeCount = qrCodes?.filter(q => q.status === "active" || q.status === "trial_active").length || 0;

  return (
    <div className="space-y-6">
      <DownloadQRDialog
        open={downloadDialog.open}
        onOpenChange={(open) => setDownloadDialog((prev) => ({ ...prev, open }))}
        destinationUrl={downloadDialog.url}
        color={downloadDialog.color}
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
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-3">
          <QrCode className="w-7 h-7" />
          Códigos QR Activos ({activeCount})
        </h1>
        <Button variant="hero" asChild>
          <Link to="/dashboard/create">
            <Plus className="w-4 h-4" />
            Crear código QR
          </Link>
        </Button>
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
          {filteredAndSorted.map((qr) => (
            <div
              key={qr.id}
              className="bg-card rounded-xl border hover:shadow-md transition-shadow overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row">
                {/* QR Preview */}
                <div className="sm:w-44 sm:min-h-[200px] p-4 flex flex-col items-center justify-center gap-3 bg-muted/30 border-b sm:border-b-0 sm:border-r">
                  <div className="w-32 h-32 sm:w-36 sm:h-36">
                    <QRPreviewImage url={qr.slug} color={qr.color || "#000000"} />
                  </div>
                  <div className="flex flex-col gap-2 w-full px-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => navigate(`/dashboard/qr/${qr.id}`)}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      {qr.total_scans_cached} Escaneos
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() =>
                        setDownloadDialog({
                          open: true,
                          url: qr.destination_url,
                          color: qr.color || "#000000",
                          name: qr.name,
                        })
                      }
                    >
                      <Download className="w-3.5 h-3.5 mr-1" />
                      Descargar
                    </Button>
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 p-4 sm:p-5 relative">
                  {/* Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="absolute top-3 right-3 h-8 w-8">
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

                  <div className="space-y-3 pr-8">
                    {/* Status + Type */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={statusColors[qr.status]}>
                        {statusLabels[qr.status]}
                      </Badge>
                      <span className="text-xs text-primary font-medium flex items-center gap-1">
                        <Link2 className="w-3 h-3" />
                        URL del sitio web
                      </span>
                    </div>

                    {/* Name */}
                    <h3 className="font-bold text-lg text-foreground leading-tight">
                      {qr.name}
                    </h3>

                    {/* Updated date */}
                    <p className="text-xs text-muted-foreground">
                      Actualizado {new Date(qr.updated_at).toLocaleDateString("es-AR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>

                    {/* Short link */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Link2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate font-mono text-xs">
                        {window.location.host}/r/{qr.slug}
                      </span>
                    </div>

                    {/* Destination */}
                    <div className="flex items-center gap-2 text-sm">
                      <ExternalLink className="w-3.5 h-3.5 text-primary shrink-0" />
                      <a
                        href={qr.destination_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline truncate text-xs"
                      >
                        {qr.destination_url}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
