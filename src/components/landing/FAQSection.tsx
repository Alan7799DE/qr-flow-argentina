import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

const faqs = [
  {
    question: "¿Qué es un QR dinámico?",
    answer: "Un QR dinámico te permite cambiar la URL de destino en cualquier momento sin necesidad de reimprimir el código. El QR apunta a nuestra plataforma, que redirige al destino que vos configurás.",
  },
  {
    question: "¿Puedo probar gratis?",
    answer: "Sí, ofrecemos un período de prueba gratuito de 7 días en todos los planes. No se requiere tarjeta de crédito para empezar.",
  },
  {
    question: "¿Qué pasa si mi QR vence?",
    answer: "Si tu suscripción vence, los QRs dejarán de redirigir al destino y mostrarán una página para reactivarlos. Tus datos se mantienen seguros y podés reactivar en cualquier momento.",
  },
  {
    question: "¿Cómo funcionan los analytics?",
    answer: "Registramos cada escaneo de tus QRs, incluyendo fecha, dispositivo y sistema operativo. Podés ver métricas de las últimas 24h, 7 días, 14 días, 21 días y 30 días.",
  },
  {
    question: "¿Puedo cambiar de plan?",
    answer: "Sí, podés actualizar o bajar de plan en cualquier momento desde tu panel. Los cambios se aplican en el siguiente período de facturación.",
  },
  {
    question: "¿Qué métodos de pago aceptan?",
    answer: "Procesamos todos los pagos a través de Mercado Pago, lo que significa que podés pagar con tarjetas de crédito, débito, dinero en cuenta y otros métodos disponibles en Argentina.",
  },
];

export function FAQSection() {
  return (
    <section id="faq" className="section-padding bg-background">
      <div className="container mx-auto max-w-3xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-muted-foreground text-sm font-medium mb-6">
            <HelpCircle className="w-4 h-4" />
            Preguntas frecuentes
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            ¿Tenés dudas?
          </h2>
          <p className="text-lg text-muted-foreground">
            Acá encontrás respuestas a las preguntas más comunes.
          </p>
        </div>

        {/* FAQ Accordion in container card */}
        <div className="bg-card rounded-2xl border p-8 relative overflow-hidden">
          <HelpCircle className="absolute -right-8 -bottom-8 w-48 h-48 text-muted-foreground/5 pointer-events-none" />
          <Accordion type="single" collapsible className="w-full relative z-10">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border-b last:border-b-0">
                <AccordionTrigger className="text-left font-medium text-foreground hover:text-primary py-6">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-6">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
