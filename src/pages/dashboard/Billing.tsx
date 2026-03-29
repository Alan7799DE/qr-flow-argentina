import { Button } from "@/components/ui/button";
import { CreditCard, Check, AlertCircle, Loader2, ExternalLink, XCircle } from "lucide-react";
import { usePlans, useSubscription } from "@/hooks/useSubscription";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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

export default function Billing() {
  const { data: plans, isLoading: loadingPlans } = usePlans();
  const { data: subscription, isLoading: loadingSubscription, refetch } = useSubscription();
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const isLoading = loadingPlans || loadingSubscription;
  const plan = plans?.[0]; // Single plan
  const isActive = subscription?.status === "active";

  const handleCancelSubscription = async () => {
    setIsCancelling(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Debes iniciar sesión para cancelar la suscripción");
        return;
      }

      const { data, error } = await supabase.functions.invoke('cancel-subscription');
      if (error) {
        toast.error("Error al cancelar la suscripción");
        return;
      }

      if (data?.success) {
        toast.success("Suscripción cancelada exitosamente");
        refetch();
      } else {
        toast.error(data?.error || "Error al cancelar la suscripción");
      }
    } catch (err) {
      toast.error("Error al procesar la cancelación");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleSubscribe = async () => {
    if (!plan) return;
    setIsSubscribing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Debes iniciar sesión para suscribirte");
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-subscription', {
        body: { plan_id: plan.id },
      });

      if (error) {
        toast.error("Error al crear la suscripción");
        return;
      }

      if (data?.init_point) {
        window.location.href = data.init_point;
      } else {
        toast.error("No se pudo obtener el link de pago");
      }
    } catch (err) {
      toast.error("Error al procesar la suscripción");
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Facturación</h1>
        <p className="text-muted-foreground mt-1">
          Gestioná tu suscripción y método de pago
        </p>
      </div>

      {/* Current Plan Status */}
      <div className="bg-card rounded-xl border p-6">
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : isActive ? (
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
              <Check className="w-6 h-6 text-success" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-foreground">
                Plan Pro — Activo
              </h2>
              <p className="text-muted-foreground mt-1">
                Próxima facturación:{" "}
                {subscription?.current_period_end
                  ? new Date(subscription.current_period_end).toLocaleDateString("es-AR")
                  : "N/A"}
              </p>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                    disabled={isCancelling}
                  >
                    {isCancelling ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Cancelando...
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 mr-2" />
                        Cancelar suscripción
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Cancelar suscripción?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Al cancelar tu suscripción, todos tus códigos QR dejarán de funcionar inmediatamente.
                      Esta acción no se puede deshacer, pero podés volver a suscribirte en cualquier momento.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Mantener suscripción</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleCancelSubscription}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Sí, cancelar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-warning" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-foreground">Sin suscripción activa</h2>
              <p className="text-muted-foreground mt-1">
                Tus QRs están en período de prueba. Suscribite al Plan Pro para mantenerlos activos.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Plan Pro Card */}
      {isLoading ? (
        <Skeleton className="h-80 max-w-lg" />
      ) : plan && !isActive ? (
        <div className="max-w-lg">
          <div className="bg-card rounded-xl border ring-2 ring-primary p-6">
            <h3 className="text-xl font-semibold text-foreground text-center mb-2">
              Plan Pro
            </h3>
            <div className="text-center mb-6">
              <span className="text-3xl font-bold text-foreground">
                ${plan.price_ars.toLocaleString("es-AR")}
              </span>
              <span className="text-muted-foreground">/mes</span>
              <p className="text-xs text-muted-foreground mt-1">ARS + IVA</p>
            </div>

            <ul className="space-y-3 mb-6">
              {[
                `${plan.qr_limit} QRs activos`,
                `${plan.retention_days} días de estadísticas`,
                "Personalización completa (colores, logo, forma)",
                "Descarga PNG/SVG",
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="w-4 h-4 text-success" />
                  {feature}
                </li>
              ))}
            </ul>

            <Button
              variant="hero"
              className="w-full"
              disabled={isSubscribing}
              onClick={handleSubscribe}
              data-gtm="btn-subscribe-pro"
            >
              {isSubscribing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  Suscribirme — ${plan.price_ars.toLocaleString("es-AR")}/mes
                  <ExternalLink className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      ) : null}

      {/* Payment info */}
      <div className="bg-card rounded-xl border p-6">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Método de pago</h3>
        </div>
        <p className="text-muted-foreground">
          Los pagos se procesan de forma segura a través de Mercado Pago.
          Aceptamos tarjetas de crédito, débito y otros medios de pago locales.
        </p>
      </div>
    </div>
  );
}
