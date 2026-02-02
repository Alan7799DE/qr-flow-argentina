import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Check, Star } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "2.499",
    description: "Ideal para emprendedores y pequeños negocios",
    features: [
      "Hasta 5 QRs dinámicos",
      "Analytics últimos 30 días",
      "Descarga PNG/SVG",
      "Personalización de colores",
      "Soporte por email",
    ],
    popular: false,
    cta: "Empezar prueba gratis",
  },
  {
    name: "Pro",
    price: "5.999",
    description: "Para negocios en crecimiento que necesitan más",
    features: [
      "Hasta 10 QRs dinámicos",
      "Analytics últimos 180 días",
      "Descarga PNG/SVG",
      "Personalización + Logo",
      "UTM Builder",
      "Soporte prioritario",
    ],
    popular: true,
    cta: "Empezar prueba gratis",
  },
  {
    name: "Business",
    price: "14.999",
    description: "Para empresas con alto volumen de QRs",
    features: [
      "Hasta 50 QRs dinámicos",
      "Analytics últimos 180 días",
      "Descarga PNG/SVG",
      "Personalización + Logo",
      "UTM Builder",
      "API access",
      "Soporte dedicado",
    ],
    popular: false,
    cta: "Empezar prueba gratis",
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="section-padding gradient-hero">
      <div className="container mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Star className="w-4 h-4" />
            Precios simples
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Elegí el plan ideal para vos
          </h2>
          <p className="text-lg text-muted-foreground">
            Probá gratis por 7 días. Sin tarjeta de crédito. Cancelá cuando quieras.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative p-8 rounded-2xl transition-all duration-300 ${
                plan.popular
                  ? "bg-card border-2 border-primary shadow-xl shadow-primary/10 scale-105"
                  : "bg-card border shadow-lg hover:shadow-xl hover:-translate-y-1"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full gradient-bg text-primary-foreground text-sm font-medium shadow-md">
                  Más popular
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {plan.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {plan.description}
                </p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-sm text-muted-foreground">$</span>
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground">/mes</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">ARS + IVA</p>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-success" />
                    </div>
                    <span className="text-sm text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.popular ? "hero" : "outline"}
                className="w-full"
                size="lg"
                asChild
              >
                <Link to="/auth?mode=signup">{plan.cta}</Link>
              </Button>
            </div>
          ))}
        </div>

        {/* Trust badges */}
        <div className="mt-16 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Pagos seguros procesados por Mercado Pago
          </p>
          <div className="flex items-center justify-center gap-6 opacity-60">
            <div className="text-2xl font-bold text-foreground">Mercado Pago</div>
          </div>
        </div>
      </div>
    </section>
  );
}
