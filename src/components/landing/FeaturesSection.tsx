import { QrCode, BarChart3, Zap, Edit, Download, Shield, Link2, RefreshCw } from "lucide-react";

const features = [
  {
    icon: Edit,
    title: "URLs editables",
    description: "Cambiá el destino de tus QRs en cualquier momento sin tener que reimprimir.",
  },
  {
    icon: BarChart3,
    title: "Analytics detallados",
    description: "Medí escaneos por día, dispositivo, ubicación y más métricas clave.",
  },
  {
    icon: Download,
    title: "Descarga en PNG/SVG",
    description: "Exportá tus QRs en alta resolución para impresión o uso digital.",
  },
  {
    icon: Link2,
    title: "UTM Builder",
    description: "Agregá parámetros UTM automáticamente para trackear campañas en Google Analytics.",
  },
  {
    icon: RefreshCw,
    title: "Slugs personalizados",
    description: "Creá URLs amigables y regeneralas cuando quieras.",
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

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-6 rounded-2xl bg-card border shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center mb-5 shadow-md group-hover:shadow-glow transition-shadow">
                <feature.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
