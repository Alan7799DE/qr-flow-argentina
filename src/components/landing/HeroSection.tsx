import { QRCreatorPublic } from "./QRCreatorPublic";

export function HeroSection() {
  return (
    <section className="relative min-h-screen gradient-hero pt-20 sm:pt-24 pb-16 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/4 w-[600px] h-[600px] rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Compact heading */}
        <div className="text-center mb-4 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-3">
            Creá tu <span className="gradient-text">código QR</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
            Generá QRs <strong className="text-foreground">dinámicos</strong>, <strong className="text-foreground">editables</strong> y con <strong className="text-foreground">analytics</strong> en tiempo real
          </p>
        </div>

        {/* QR Creator */}
        <div className="max-w-5xl mx-auto">
          <QRCreatorPublic />
        </div>
      </div>
    </section>
  );
}
