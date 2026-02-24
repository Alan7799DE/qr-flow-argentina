import { QrCode, BarChart3, Zap, Edit, Download, Shield, Link2, RefreshCw } from "lucide-react";

const featuredItems = [
  {
    icon: Edit,
    title: "URLs editables",
    description: "Cambiá el destino de tus QRs en cualquier momento sin tener que reimprimir. Perfecto para promociones, menús y campañas que evolucionan.",
  },
  {
    icon: BarChart3,
    title: "Analytics detallados",
    description: "Medí escaneos por día, dispositivo, ubicación y más métricas clave. Tomá decisiones basadas en datos reales.",
  },
];

const compactItems = [
  {
    icon: Download,
    title: "Descarga en PNG/SVG",
    description: "Exportá tus QRs en alta resolución para impresión o uso digital.",
  },
  {
    icon: RefreshCw,
    title: "Slugs personalizados",
    description: "Creá URLs amigables y regeneralas cuando quieras.",
  },
  {
    icon: Link2,
    title: "UTM Builder",
    description: "Agregá parámetros UTM automáticamente para trackear campañas.",
  },
  {
    icon: Shield,
    title: "99.9% Uptime",
    description: "Infraestructura confiable para que tus QRs siempre funcionen.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="section-padding bg-background">
      <div className="container mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            Funcionalidades
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Todo lo que necesitás para tus QRs
          </h2>
          <p className="text-lg text-muted-foreground">
            Una plataforma completa para crear, gestionar y analizar códigos QR dinámicos.
          </p>
        </div>

        {/* Featured - 2 big cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {featuredItems.map((feature, index) => (
            <div
              key={index}
              className="p-8 rounded-2xl bg-card border border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow duration-300"
            >
              <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center mb-5 shadow-md">
                <feature.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Compact - 4 small cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {compactItems.map((feature, index) => (
            <div
              key={index}
              className="p-5 rounded-xl bg-muted/50 hover:bg-muted/80 transition-colors duration-300"
            >
              <div className="flex items-center gap-2.5 mb-3">
                <feature.icon className="w-5 h-5 text-primary shrink-0" />
                <h3 className="text-sm font-semibold text-foreground">
                  {feature.title}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
