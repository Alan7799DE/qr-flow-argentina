import { 
  Store, Utensils, Building2, Megaphone, GraduationCap, Ticket,
  TrendingUp, Pencil, BarChart3, Smartphone, Zap, Globe 
} from "lucide-react";

const benefits = [
  {
    icon: Pencil,
    title: "Editables en cualquier momento",
    description: "Cambiá la URL de destino sin reimprimir. Ideal para promociones, menús o campañas que cambian.",
  },
  {
    icon: BarChart3,
    title: "Analytics en tiempo real",
    description: "Sabé cuántas personas escanean tus QRs, desde qué dispositivo y en qué momento.",
  },
  {
    icon: Zap,
    title: "Creación instantánea",
    description: "Generá tu QR en segundos. Sin complicaciones, sin software adicional.",
  },
  {
    icon: Smartphone,
    title: "Compatibles con todos los dispositivos",
    description: "Funcionan en cualquier celular con cámara, sin necesidad de apps especiales.",
  },
  {
    icon: TrendingUp,
    title: "Optimizá tus campañas",
    description: "Usá parámetros UTM para medir el rendimiento de cada canal de marketing.",
  },
  {
    icon: Globe,
    title: "Accesibles desde cualquier lugar",
    description: "Tus QRs funcionan en todo el mundo, 24/7, sin límites geográficos.",
  },
];

const useCases = [
  {
    icon: Utensils,
    title: "Restaurantes y bares",
    description: "Menús digitales actualizables al instante. Cambiá platos y precios sin reimprimir.",
  },
  {
    icon: Store,
    title: "Comercios y retail",
    description: "Promociones en vidrieras, catálogos de productos y programas de fidelización.",
  },
  {
    icon: Megaphone,
    title: "Marketing y publicidad",
    description: "Flyers, carteles y packaging con QRs que llevan a landing pages medibles.",
  },
  {
    icon: Building2,
    title: "Empresas y oficinas",
    description: "Tarjetas de presentación digitales, acceso a WiFi y formularios internos.",
  },
  {
    icon: GraduationCap,
    title: "Educación",
    description: "Material complementario, encuestas y recursos descargables para alumnos.",
  },
  {
    icon: Ticket,
    title: "Eventos",
    description: "Entradas digitales, agendas interactivas y feedback post-evento.",
  },
];

export function BenefitsSection() {
  return (
    <section id="pricing" className="section-padding gradient-hero">
      <div className="container mx-auto">
        {/* Benefits */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            ¿Por qué usar códigos QR dinámicos?
          </h2>
          <p className="text-lg text-muted-foreground">
            Más que un simple enlace: una herramienta poderosa para conectar el mundo físico con el digital.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto mb-20">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="p-6 rounded-2xl bg-card border shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <benefit.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {benefit.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>

        {/* Use Cases */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Casos de uso
          </h2>
          <p className="text-lg text-muted-foreground">
            Desde restaurantes hasta eventos, los QRs dinámicos se adaptan a cualquier industria.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {useCases.map((useCase, index) => (
            <div
              key={index}
              className="p-6 rounded-2xl bg-card border shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                <useCase.icon className="w-5 h-5 text-accent-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {useCase.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {useCase.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
