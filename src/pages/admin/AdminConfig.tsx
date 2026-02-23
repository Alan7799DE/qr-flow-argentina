import { useState, useEffect } from "react";
import { useAppConfig } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings, Save, Loader2, Clock, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminConfig() {
  const { data: config, isLoading } = useAppConfig();
  const queryClient = useQueryClient();
  const [trialNoticeDays, setTrialNoticeDays] = useState(1);
  const [trialExpireDays, setTrialExpireDays] = useState(8);
  const [gracePeriodHours, setGracePeriodHours] = useState(24);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setTrialNoticeDays(config.trial_notice_days);
      setTrialExpireDays(config.trial_expire_days);
      setGracePeriodHours((config as any).grace_period_hours ?? 24);
    }
  }, [config]);

  const handleSave = async () => {
    if (trialNoticeDays >= trialExpireDays) {
      toast.error("Los días de aviso deben ser menores a los días de expiración");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("app_config")
        .update({
          trial_notice_days: trialNoticeDays,
          trial_expire_days: trialExpireDays,
          grace_period_hours: gracePeriodHours,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", 1);

      if (error) throw error;

      toast.success("Configuración actualizada correctamente");
      queryClient.invalidateQueries({ queryKey: ["app-config"] });
    } catch (error) {
      console.error("Error updating config:", error);
      toast.error("Error al actualizar la configuración");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges =
    config &&
    (trialNoticeDays !== config.trial_notice_days ||
      trialExpireDays !== config.trial_expire_days ||
      gracePeriodHours !== ((config as any).grace_period_hours ?? 24));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Configuración</h1>
        <p className="text-muted-foreground mt-1">
          Ajustes globales del sistema de trials
        </p>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full max-w-lg" />
      ) : (
        <div className="max-w-lg space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Sistema de Trial
              </CardTitle>
              <CardDescription>
                Configura los días para enviar avisos y expirar QRs de usuarios sin suscripción
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="notice-days">Días para enviar aviso</Label>
                <Input
                  id="notice-days"
                  type="number"
                  min={1}
                  value={trialNoticeDays}
                  onChange={(e) => setTrialNoticeDays(parseInt(e.target.value) || 1)}
                />
                <p className="text-sm text-muted-foreground">
                  Cuántos días después de crear el QR se envía el email de aviso
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expire-days">Días para expirar</Label>
                <Input
                  id="expire-days"
                  type="number"
                  min={2}
                  value={trialExpireDays}
                  onChange={(e) => setTrialExpireDays(parseInt(e.target.value) || 2)}
                />
                <p className="text-sm text-muted-foreground">
                  Cuántos días después de crear el QR expira automáticamente
                </p>
              </div>

              {trialNoticeDays >= trialExpireDays && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg text-destructive">
                  <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
                  <p className="text-sm">
                    Los días de aviso deben ser menores a los días de expiración
                  </p>
                </div>
              )}

              <div className="border-t pt-6 space-y-2">
                <Label htmlFor="grace-hours" className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  Período de gracia (horas)
                </Label>
                <Input
                  id="grace-hours"
                  type="number"
                  min={1}
                  max={168}
                  value={gracePeriodHours}
                  onChange={(e) => setGracePeriodHours(parseInt(e.target.value) || 24)}
                />
                <p className="text-sm text-muted-foreground">
                  Horas que los QRs siguen activos después de un fallo de pago antes de desactivarse
                </p>
              </div>

              <Button
                onClick={handleSave}
                disabled={saving || !hasChanges || trialNoticeDays >= trialExpireDays}
                className="w-full"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar cambios
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Información del Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Última actualización</span>
                <span className="font-medium">
                  {config?.updated_at
                    ? new Date(config.updated_at).toLocaleString("es-AR")
                    : "-"}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">ID configuración</span>
                <span className="font-mono text-sm">{config?.id}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
