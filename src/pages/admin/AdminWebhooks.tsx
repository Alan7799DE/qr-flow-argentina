import { useWebhookLogs } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from "@/components/ui/dialog";
import { Webhook, Eye, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface WebhookLog {
  id: string;
  provider: string;
  event_type: string;
  payload: unknown;
  processed: boolean;
  error_message: string | null;
  created_at: string;
}

export default function AdminWebhooks() {
  const { data: webhooks, isLoading, refetch } = useWebhookLogs();
  const queryClient = useQueryClient();
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookLog | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Webhooks</h1>
          <p className="text-muted-foreground mt-1">
            Registro de webhooks de Mercado Pago
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="w-5 h-5" />
            Últimos 50 webhooks
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-muted-foreground">Evento</th>
                    <th className="pb-3 font-medium text-muted-foreground">Provider</th>
                    <th className="pb-3 font-medium text-muted-foreground">Estado</th>
                    <th className="pb-3 font-medium text-muted-foreground">Fecha</th>
                    <th className="pb-3 font-medium text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {webhooks?.map((webhook) => (
                    <tr key={webhook.id} className="hover:bg-muted/50">
                      <td className="py-4">
                        <span className="font-medium text-foreground">
                          {webhook.event_type}
                        </span>
                      </td>
                      <td className="py-4">
                        <Badge variant="outline">{webhook.provider}</Badge>
                      </td>
                      <td className="py-4">
                        {webhook.processed ? (
                          <Badge className="bg-success text-success-foreground">
                            Procesado
                          </Badge>
                        ) : webhook.error_message ? (
                          <Badge variant="destructive">Error</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-warning/10 text-warning">
                            Pendiente
                          </Badge>
                        )}
                      </td>
                      <td className="py-4 text-muted-foreground">
                        {new Date(webhook.created_at).toLocaleString("es-AR")}
                      </td>
                      <td className="py-4">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedWebhook(webhook)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
                            <DialogHeader>
                              <DialogTitle>Detalles del Webhook</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm text-muted-foreground">Evento</p>
                                  <p className="font-medium">{webhook.event_type}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Provider</p>
                                  <p className="font-medium">{webhook.provider}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Estado</p>
                                  <p className="font-medium">
                                    {webhook.processed ? "Procesado" : "Pendiente"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Fecha</p>
                                  <p className="font-medium">
                                    {new Date(webhook.created_at).toLocaleString("es-AR")}
                                  </p>
                                </div>
                              </div>

                              {webhook.error_message && (
                                <div className="p-3 bg-destructive/10 rounded-lg">
                                  <p className="text-sm text-muted-foreground mb-1">Error</p>
                                  <p className="text-destructive">{webhook.error_message}</p>
                                </div>
                              )}

                              <div>
                                <p className="text-sm text-muted-foreground mb-2">Payload</p>
                                <pre className="p-4 bg-muted rounded-lg overflow-auto text-xs">
                                  {JSON.stringify(webhook.payload, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!webhooks || webhooks.length === 0) && (
                <p className="text-center py-8 text-muted-foreground">
                  No hay webhooks registrados
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
