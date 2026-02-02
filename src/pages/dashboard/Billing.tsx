import { Button } from "@/components/ui/button";
import { CreditCard, Check, AlertCircle, Loader2 } from "lucide-react";
import { usePlans, useSubscription } from "@/hooks/useSubscription";
import { Skeleton } from "@/components/ui/skeleton";

export default function Billing() {
  const { data: plans, isLoading: loadingPlans } = usePlans();
  const { data: subscription, isLoading: loadingSubscription } = useSubscription();

  const isLoading = loadingPlans || loadingSubscription;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Facturación</h1>
        <p className="text-muted-foreground mt-1">
          Gestioná tu suscripción y método de pago
        </p>
      </div>

      {/* Current Plan */}
      <div className="bg-card rounded-xl border p-6">
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : subscription?.status === "active" ? (
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
              <Check className="w-6 h-6 text-success" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-foreground">
                Plan {subscription.plan?.name}
              </h2>
              <p className="text-muted-foreground mt-1">
                Tu suscripción está activa. Próxima facturación:{" "}
                {subscription.current_period_end
                  ? new Date(subscription.current_period_end).toLocaleDateString("es-AR")
                  : "N/A"}
              </p>
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
                Tus QRs están en período de prueba. Elegí un plan para mantenerlos activos.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Plans Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans?.map((plan, index) => {
            const isCurrentPlan = subscription?.plan_id === plan.id && subscription.status === "active";
            const isPro = plan.slug === "pro";

            const features = [
              `${plan.qr_limit} QRs`,
              `${plan.retention_days} días analytics`,
              ...(plan.has_logo_customization ? ["Logo personalizado"] : []),
              ...(plan.has_api_access ? ["API access"] : []),
            ];

            return (
              <div
                key={plan.id}
                className={`bg-card rounded-xl border p-6 ${
                  isPro ? "ring-2 ring-primary" : ""
                } ${isCurrentPlan ? "ring-2 ring-success" : ""}`}
              >
                {isPro && !isCurrentPlan && (
                  <div className="text-center mb-4">
                    <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                      Recomendado
                    </span>
                  </div>
                )}
                {isCurrentPlan && (
                  <div className="text-center mb-4">
                    <span className="inline-block px-3 py-1 rounded-full bg-success/10 text-success text-sm font-medium">
                      Tu plan actual
                    </span>
                  </div>
                )}

                <h3 className="text-xl font-semibold text-foreground text-center mb-2">
                  {plan.name}
                </h3>
                <div className="text-center mb-6">
                  <span className="text-3xl font-bold text-foreground">
                    ${plan.price_ars.toLocaleString("es-AR")}
                  </span>
                  <span className="text-muted-foreground">/mes</span>
                  <p className="text-xs text-muted-foreground mt-1">ARS + IVA</p>
                </div>

                <ul className="space-y-3 mb-6">
                  {features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                      <Check className="w-4 h-4 text-success" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  variant={isPro ? "hero" : "outline"}
                  className="w-full"
                  disabled={isCurrentPlan}
                >
                  {isCurrentPlan ? "Plan actual" : `Elegir ${plan.name}`}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Payment info */}
      <div className="bg-card rounded-xl border p-6">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Método de pago</h3>
        </div>
        <p className="text-muted-foreground">
          Los pagos se procesan de forma segura a través de Mercado Pago. 
          La integración con Mercado Pago se configurará próximamente.
        </p>
      </div>
    </div>
  );
}
