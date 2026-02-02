import { QrCode, TrendingUp, Eye, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useQRCodes } from "@/hooks/useQRCodes";
import { useAllQRStats } from "@/hooks/useScanStats";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const statusColors = {
  trial_active: "bg-warning/10 text-warning",
  active: "bg-success/10 text-success",
  paused: "bg-muted text-muted-foreground",
  expired: "bg-destructive/10 text-destructive",
};

const statusLabels = {
  trial_active: "Trial",
  active: "Activo",
  paused: "Pausado",
  expired: "Vencido",
};

export default function Dashboard() {
  const { data: qrCodes, isLoading: loadingQRs } = useQRCodes();
  const { data: stats, isLoading: loadingStats } = useAllQRStats();

  const statCards = [
    { label: "QRs activos", value: stats?.activeQRs ?? 0, icon: QrCode, color: "primary" },
    { label: "Escaneos hoy", value: stats?.scansToday ?? 0, icon: Eye, color: "accent" },
    { label: "Escaneos 7 días", value: stats?.scans7d ?? 0, icon: TrendingUp, color: "success" },
    { label: "Próximo vencimiento", value: stats?.nextExpiry ?? "-", icon: Clock, color: "warning" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Bienvenido a tu panel de control de QRs
          </p>
        </div>
        <Button variant="hero" asChild>
          <Link to="/dashboard/create">
            <QrCode className="w-4 h-4" />
            Crear nuevo QR
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className="bg-card rounded-xl border p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                stat.color === "primary" ? "bg-primary/10 text-primary" :
                stat.color === "accent" ? "bg-accent/10 text-accent" :
                stat.color === "success" ? "bg-success/10 text-success" :
                "bg-warning/10 text-warning"
              }`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
            {loadingStats ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            )}
            <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* QR List or Empty State */}
      {loadingQRs ? (
        <div className="bg-card rounded-xl border p-6">
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
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
            <Link to="/dashboard/create">
              Crear QR ahora
            </Link>
          </Button>
        </div>
      ) : (
        <div className="bg-card rounded-xl border">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-foreground">Mis QRs ({qrCodes.length})</h2>
          </div>
          <div className="divide-y">
            {qrCodes.map((qr) => (
              <Link
                key={qr.id}
                to={`/dashboard/qr/${qr.id}`}
                className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                    <QrCode className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{qr.name}</h3>
                    <p className="text-sm text-muted-foreground truncate max-w-[200px] sm:max-w-[300px]">
                      {qr.destination_url}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="font-medium text-foreground">{qr.total_scans_cached}</p>
                    <p className="text-xs text-muted-foreground">escaneos</p>
                  </div>
                  <Badge className={statusColors[qr.status]}>
                    {statusLabels[qr.status]}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
