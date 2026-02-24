import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import { QRCreatorPublic } from "./QRCreatorPublic";

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

          {/* CTA Button */}
          <div className="flex items-center justify-center mb-12 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
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

        {/* QR Creator */}
        <div className="mt-12 max-w-4xl mx-auto animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
          <QRCreatorPublic />
        </div>
      </div>
    </section>
  );
}
