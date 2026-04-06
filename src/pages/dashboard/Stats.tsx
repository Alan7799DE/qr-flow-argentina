import { useState, useEffect } from "react";
import { SEOHead } from "@/components/SEOHead";
import { BarChart3, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQRCodes } from "@/hooks/useQRCodes";
import { useScanStats } from "@/hooks/useScanStats";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Stats() {
  const { data: qrCodes, isLoading: loadingQRs } = useQRCodes();
  const [selectedQRId, setSelectedQRId] = useState<string>("");

  const activeQRs = qrCodes?.filter((qr) => !qr.deleted_at) || [];

  useEffect(() => {
    if (activeQRs.length > 0 && !selectedQRId) {
      setSelectedQRId(activeQRs[0].id);
    }
  }, [activeQRs, selectedQRId]);

  const { data: stats, isLoading: loadingStats } = useScanStats(selectedQRId);
  const selectedQR = activeQRs.find((qr) => qr.id === selectedQRId);

  if (loadingQRs) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (activeQRs.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Estadísticas</h1>
        <div className="bg-card rounded-xl border p-12 text-center">
          <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No tenés QR codes creados todavía.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SEOHead title="Estadísticas" description="Visualizá las estadísticas de escaneos de tus códigos QR dinámicos." noindex />
      <h1 className="text-2xl font-bold text-foreground">Estadísticas</h1>

      <Alert variant="default" className="bg-muted/50 border-muted-foreground/20">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm text-muted-foreground">
          Las estadísticas se actualizan cada 24 horas. Los escaneos recientes se reflejarán en el próximo ciclo de actualización.
        </AlertDescription>
      </Alert>

      {/* QR Selector */}
      <div className="max-w-sm">
        <Select value={selectedQRId} onValueChange={setSelectedQRId}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccioná un QR" />
          </SelectTrigger>
          <SelectContent>
            {activeQRs.map((qr) => (
              <SelectItem key={qr.id} value={qr.id}>
                {qr.name} · {qr.total_scans_cached} escaneos
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Chart */}
      <div className="bg-card rounded-xl border p-6">
        <h3 className="font-semibold text-foreground mb-4">
          Escaneos · Últimos 15 días
          {selectedQR && <span className="text-muted-foreground font-normal"> — {selectedQR.name}</span>}
        </h3>
        <div
          className="h-40 rounded-lg bg-muted/30 flex items-end justify-between p-4 gap-1"
          role="group"
          aria-label="Gráfico de escaneos diarios"
        >
          {loadingStats ? (
            <Skeleton className="h-full w-full" />
          ) : (
            stats?.dailyScans.map((day, i) => {
              const maxCount = Math.max(...stats.dailyScans.map((d) => d.count), 1);
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
        <div className="flex justify-between mt-2">
          {stats?.dailyScans.map((day, i) => (
            <span key={i} className="flex-1 text-center text-[10px] text-muted-foreground">
              {new Date(day.date + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
