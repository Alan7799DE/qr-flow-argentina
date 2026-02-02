import { Button } from "@/components/ui/button";
import { CreditCard, Check, AlertCircle } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "2.499",
    current: false,
    features: ["5 QRs", "30 días analytics"],
  },
  {
    name: "Pro",
    price: "5.999",
    current: false,
    features: ["10 QRs", "180 días analytics", "Logo"],
  },
  {
    name: "Business",
    price: "14.999",
    current: false,
    features: ["50 QRs", "180 días analytics", "Logo", "API"],
  },
];

export default function Billing() {
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
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan, index) => (
          <div
            key={index}
            className={`bg-card rounded-xl border p-6 ${
              plan.name === "Pro" ? "ring-2 ring-primary" : ""
            }`}
          >
            {plan.name === "Pro" && (
              <div className="text-center mb-4">
                <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  Recomendado
                </span>
              </div>
            )}
            <h3 className="text-xl font-semibold text-foreground text-center mb-2">
              {plan.name}
            </h3>
            <div className="text-center mb-6">
              <span className="text-3xl font-bold text-foreground">${plan.price}</span>
              <span className="text-muted-foreground">/mes</span>
            </div>

            <ul className="space-y-3 mb-6">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="w-4 h-4 text-success" />
                  {feature}
                </li>
              ))}
            </ul>

            <Button
              variant={plan.name === "Pro" ? "hero" : "outline"}
              className="w-full"
            >
              Elegir {plan.name}
            </Button>
          </div>
        ))}
      </div>

      {/* Payment info */}
      <div className="bg-card rounded-xl border p-6">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Método de pago</h3>
        </div>
        <p className="text-muted-foreground">
          Los pagos se procesan de forma segura a través de Mercado Pago.
        </p>
      </div>
    </div>
  );
}
