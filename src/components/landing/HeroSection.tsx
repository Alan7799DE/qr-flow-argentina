import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, QrCode, BarChart3, Zap } from "lucide-react";

const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
  e.preventDefault();
  const element = document.getElementById(sectionId);
  if (element) {
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};

export function HeroSection() {
  return (
    <section className="relative min-h-screen gradient-hero pt-24 pb-16 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/4 w-[600px] h-[600px] rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 animate-fade-in">
            <Zap className="w-4 h-4" />
            La forma más fácil de crear QRs dinámicos
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 animate-fade-in-up">
            Creá <span className="gradient-text">QRs dinámicos</span> y medí su impacto en tiempo real
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            Generá códigos QR editables, rastreá cada escaneo con analytics detallados y optimizá tus campañas. Todo desde una plataforma simple y poderosa.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <Button variant="hero" size="xl" asChild>
              <Link to="/auth?mode=signup">
                Empezar gratis
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
            <Button variant="hero-outline" size="xl" asChild>
              <a href="#pricing" onClick={(e) => scrollToSection(e, "pricing")}>Ver precios</a>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-foreground mb-1">10K+</div>
              <div className="text-muted-foreground text-sm">QRs creados</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-foreground mb-1">500K+</div>
              <div className="text-muted-foreground text-sm">Escaneos rastreados</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-foreground mb-1">99.9%</div>
              <div className="text-muted-foreground text-sm">Uptime garantizado</div>
            </div>
          </div>
        </div>

        {/* Hero Visual */}
        <div className="mt-16 max-w-5xl mx-auto animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
          <div className="relative">
            {/* Dashboard Preview Card */}
            <div className="card-elevated p-6 sm:p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center">
                  <QrCode className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Mi QR de Marketing</h3>
                  <p className="text-sm text-muted-foreground">qrapido.com/r/marketing-2024</p>
                </div>
                <div className="ml-auto px-3 py-1 rounded-full bg-success/10 text-success text-sm font-medium">
                  Activo
                </div>
              </div>

              {/* Analytics Preview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {[
                  { label: "Últimas 24h", value: "234", icon: BarChart3 },
                  { label: "7 días", value: "1.2K", icon: BarChart3 },
                  { label: "30 días", value: "8.5K", icon: BarChart3 },
                  { label: "Total", value: "45K", icon: BarChart3 },
                ].map((stat, i) => (
                  <div key={i} className="p-4 rounded-xl bg-muted/50 text-center">
                    <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                    <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Chart placeholder */}
              <div className="h-32 rounded-lg bg-muted/30 flex items-end justify-between p-4 gap-1">
                {Array.from({ length: 30 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t bg-primary/60 transition-all hover:bg-primary"
                    style={{ 
                      height: `${20 + Math.random() * 80}%`,
                      animationDelay: `${i * 0.02}s`
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Floating decoration */}
            <div className="absolute -top-4 -right-4 w-20 h-20 rounded-2xl gradient-bg shadow-glow animate-float opacity-80" />
            <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-xl bg-accent/20 blur-xl" />
          </div>
        </div>
      </div>
    </section>
  );
}
