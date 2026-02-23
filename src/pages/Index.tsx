import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { Footer } from "@/components/landing/Footer";
import { SEOHead } from "@/components/SEOHead";

const faqs = [
  {
    question: "¿Qué es un QR dinámico?",
    answer: "Un QR dinámico te permite cambiar la URL de destino en cualquier momento sin necesidad de reimprimir el código.",
  },
  {
    question: "¿Puedo probar gratis?",
    answer: "Sí, ofrecemos un período de prueba gratuito de 7 días en todos los planes. No se requiere tarjeta de crédito para empezar.",
  },
  {
    question: "¿Qué pasa si mi QR vence?",
    answer: "Si tu suscripción vence, los QRs dejarán de redirigir al destino. Tus datos se mantienen seguros y podés reactivar en cualquier momento.",
  },
  {
    question: "¿Cómo funcionan los analytics?",
    answer: "Registramos cada escaneo de tus QRs, incluyendo fecha, dispositivo y sistema operativo.",
  },
  {
    question: "¿Puedo cambiar de plan?",
    answer: "Sí, podés actualizar o bajar de plan en cualquier momento desde tu panel.",
  },
  {
    question: "¿Qué métodos de pago aceptan?",
    answer: "Procesamos todos los pagos a través de Mercado Pago: tarjetas de crédito, débito, dinero en cuenta y otros métodos disponibles en Argentina.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "QRapido",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: "https://creatuqr.lovable.app",
  description: "Plataforma para crear códigos QR dinámicos con analytics detallados. Editá el destino, medí escaneos y optimizá tus campañas.",
  offers: {
    "@type": "AggregateOffer",
    priceCurrency: "ARS",
    lowPrice: "2499",
    highPrice: "14999",
    offerCount: "3",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    ratingCount: "150",
  },
  FAQPage: {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  },
};

const Index = () => {
  return (
    <div className="min-h-screen">
      <SEOHead
        title="QRapido — Creá QRs dinámicos con analytics"
        description="Creá códigos QR dinámicos, editá el destino cuando quieras y medí cada escaneo con analytics detallados. Plataforma simple y poderosa."
        canonical="/"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <PricingSection />
        <FAQSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;