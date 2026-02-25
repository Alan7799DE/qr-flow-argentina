import { QrCode, Eye, TrendingUp, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAllQRStats } from "@/hooks/useScanStats";

export default function Stats() {
  const { data: stats, isLoading } = useAllQRStats();

  const statCards = [
    { label: "QRs activos", value: stats?.activeQRs ?? 0, icon: QrCode, color: "primary" },
    { label: "Escaneos totales hoy", value: stats?.scansToday ?? 0, icon: Eye, color: "accent" },
    { label: "Escaneos totales 7 días", value: stats?.scans7d ?? 0, icon: TrendingUp, color: "success" },
    { label: "Próximo vencimiento", value: stats?.nextExpiry ?? "-", icon: Clock, color: "warning" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Estadísticas</h1>
        <p className="text-muted-foreground mt-1">
          Resumen general de todos tus códigos QR
        </p>
      </div>

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
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            )}
            <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
