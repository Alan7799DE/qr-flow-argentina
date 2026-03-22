import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Check, Star, QrCode, BarChart3, Palette } from "lucide-react";

const features = [
  "Hasta 10 QRs dinámicos activos",
  "15 días de estadísticas de escaneos",
  "Personalización completa: colores, forma y logo",
  "Descarga en PNG y SVG",
  "UTM Builder integrado",
  "Soporte por email",
];

export function PricingSection() {
  return (
    <section id="pricing" className="section-padding gradient-hero">
      <div className="container mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Star className="w-4 h-4" />
            Precio simple y transparente
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Un solo plan, todo incluido
          </h2>
          <p className="text-lg text-muted-foreground">
            Probá gratis por 7 días. Sin tarjeta de crédito. Cancelá cuando quieras.
          </p>
        </div>

        {/* Single Plan Card */}
        <div className="max-w-lg mx-auto">
          <div className="relative p-8 rounded-2xl bg-card border-2 border-primary shadow-xl shadow-primary/10">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full gradient-bg text-primary-foreground text-sm font-medium shadow-md">
              Todo incluido
            </div>

            <div className="text-center mb-8">
              <h3 className="text-2xl font-semibold text-foreground mb-2">
                Plan Pro
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Todo lo que necesitás para gestionar tus QRs dinámicos
              </p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-sm text-muted-foreground">$</span>
                <span className="text-5xl font-bold text-foreground">7.500</span>
                <span className="text-muted-foreground">/mes</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">ARS + IVA</p>
            </div>

            <ul className="space-y-4 mb-8">
              {features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-success" />
                  </div>
                  <span className="text-sm text-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              variant="hero"
              className="w-full"
              size="lg"
              asChild
            >
              <Link to="/auth?mode=signup">Empezar prueba gratis</Link>
            </Button>
          </div>
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
