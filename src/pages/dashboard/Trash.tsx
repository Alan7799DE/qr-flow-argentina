import { Trash2, RotateCcw, QrCode, Clock } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useDeletedQRCodes, useRestoreQR } from "@/hooks/useQRCodes";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function Trash() {
  const { data: deletedQRs, isLoading } = useDeletedQRCodes();
  const restoreQR = useRestoreQR();

  const getDaysRemaining = (deletedAt: string) => {
    const deleted = new Date(deletedAt);
    const expiry = new Date(deleted.getTime() + 7 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  };

  return (
    <div className="space-y-8">
      <SEOHead title="Papelera" description="QRs eliminados en QRapido. Restauralos dentro de los 7 días." noindex />
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-3">
          <Trash2 className="w-7 h-7" />
          Papelera
        </h1>
        <p className="text-muted-foreground mt-1">
          Los QRs eliminados se mantienen durante 7 días antes de borrarse permanentemente.
        </p>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="bg-card rounded-xl border p-6">
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      ) : !deletedQRs || deletedQRs.length === 0 ? (
        <div className="bg-card rounded-xl border p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
            <Trash2 className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            La papelera está vacía
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            Los QRs que elimines aparecerán acá y podrás restaurarlos dentro de los 7 días.
          </p>
          <Button variant="outline" asChild>
            <Link to="/dashboard">Volver al dashboard</Link>
          </Button>
        </div>
      ) : (
        <div className="bg-card rounded-xl border">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-foreground">
              QRs eliminados ({deletedQRs.length})
            </h2>
          </div>
          <div className="divide-y">
            {deletedQRs.map((qr) => {
              const daysLeft = getDaysRemaining(qr.deleted_at!);
              return (
                <div
                  key={qr.id}
                  className="flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center opacity-50">
                      <QrCode className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{qr.name}</h3>
                      <p className="text-sm text-muted-foreground truncate max-w-[200px] sm:max-w-[300px]">
                        {qr.destination_url}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-muted-foreground gap-1">
                      <Clock className="w-3 h-3" />
                      {daysLeft} {daysLeft === 1 ? "día" : "días"}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => restoreQR.mutate(qr.id)}
                      disabled={restoreQR.isPending}
                    >
                      <RotateCcw className="w-4 h-4" />
                      Restaurar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
