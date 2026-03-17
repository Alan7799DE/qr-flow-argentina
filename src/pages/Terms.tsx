import { SEOHead } from "@/components/SEOHead";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

const Terms = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="Términos de Servicio"
        description="Términos y condiciones de uso de QRapido. Conocé las reglas que rigen el uso de nuestra plataforma de códigos QR dinámicos."
        canonical="/terms"
      />
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">Términos de Servicio</h1>
          <p className="text-muted-foreground mb-10">Última actualización: 17 de marzo de 2026</p>

          <div className="space-y-8 text-foreground/90 leading-relaxed">
            <Section title="1. Descripción del servicio">
              <p>
                <strong>QRapido</strong> es una plataforma de software como servicio (SaaS) que permite crear, gestionar y analizar códigos QR dinámicos. Los códigos QR dinámicos permiten modificar la URL de destino en cualquier momento sin necesidad de reimprimir el código físico. El servicio incluye un panel de control con estadísticas de escaneos, gestión de códigos y personalización visual.
              </p>
            </Section>

            <Section title="2. Aceptación de los términos">
              <p>
                Al registrarte y utilizar QRapido, aceptás estos términos de servicio en su totalidad. Si no estás de acuerdo con alguna de las condiciones, no debés utilizar la plataforma. Nos reservamos el derecho de modificar estos términos en cualquier momento, notificándote por correo electrónico sobre cambios significativos.
              </p>
            </Section>

            <Section title="3. Registro y cuenta">
              <ul className="list-disc pl-6 space-y-1">
                <li>Para utilizar el servicio debés crear una cuenta proporcionando información veraz y actualizada.</li>
                <li>Podés registrarte con tu correo electrónico o mediante Google OAuth.</li>
                <li>Sos responsable de mantener la confidencialidad de tus credenciales de acceso.</li>
                <li>Debés notificarnos inmediatamente ante cualquier uso no autorizado de tu cuenta.</li>
                <li>Cada usuario puede tener una única cuenta activa.</li>
              </ul>
            </Section>

            <Section title="4. Planes y suscripciones">
              <p>QRapido ofrece diferentes planes de suscripción con distintos niveles de funcionalidad:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Cada plan establece un límite máximo de códigos QR que podés crear.</li>
                <li>Al registrarte, podés acceder a un período de prueba gratuito de 7 días sin necesidad de ingresar un método de pago.</li>
                <li>Las suscripciones se procesan exclusivamente a través de <strong>Mercado Pago</strong>.</li>
                <li>Los precios están expresados en pesos argentinos (ARS) e incluyen IVA.</li>
                <li>Las suscripciones se renuevan automáticamente según el período contratado, salvo que se cancelen previamente.</li>
              </ul>
            </Section>

            <Section title="5. Cancelación y vencimiento">
              <p>Podés cancelar tu suscripción en cualquier momento desde tu panel de control. Al cancelar o si tu suscripción vence:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li><strong>Los códigos QR se desactivarán</strong> y dejarán de redirigir a la URL de destino.</li>
                <li>Tus datos y configuraciones se mantendrán almacenados por un período de gracia, permitiéndote reactivar tu cuenta.</li>
                <li>No se realizan reembolsos por períodos parciales no utilizados.</li>
                <li>Si reactivás tu suscripción dentro del período de gracia, tus códigos QR volverán a funcionar automáticamente.</li>
              </ul>
            </Section>

            <Section title="6. Uso aceptable">
              <p>Al utilizar QRapido, te comprometés a no:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Utilizar el servicio para actividades ilegales, fraudulentas o que violen derechos de terceros.</li>
                <li>Crear códigos QR que redirijan a contenido malicioso, phishing, malware o sitios fraudulentos.</li>
                <li>Intentar acceder a datos o cuentas de otros usuarios.</li>
                <li>Realizar ingeniería inversa, descompilar o intentar extraer el código fuente del servicio.</li>
                <li>Generar tráfico artificial o automatizado hacia los códigos QR con el fin de alterar estadísticas.</li>
                <li>Revender o redistribuir el servicio sin autorización expresa.</li>
              </ul>
              <p className="mt-2">
                Nos reservamos el derecho de suspender o cancelar cuentas que violen estas condiciones, sin previo aviso y sin derecho a reembolso.
              </p>
            </Section>

            <Section title="7. Propiedad intelectual">
              <p>
                QRapido y todos sus componentes (marca, diseño, código, documentación) son propiedad exclusiva de QRapido. El usuario conserva la propiedad sobre el contenido que carga en la plataforma (logos, URLs de destino). Al utilizar el servicio, nos otorgás una licencia limitada para procesar y mostrar tu contenido exclusivamente en el contexto del servicio.
              </p>
            </Section>

            <Section title="8. Disponibilidad del servicio">
              <p>
                Nos esforzamos por mantener el servicio disponible las 24 horas del día, los 7 días de la semana. Sin embargo, no garantizamos disponibilidad ininterrumpida. El servicio puede verse afectado por mantenimiento programado, actualizaciones o circunstancias fuera de nuestro control. No seremos responsables por interrupciones temporales del servicio.
              </p>
            </Section>

            <Section title="9. Limitación de responsabilidad">
              <p>
                <strong>QRapido se proporciona "tal cual" y "según disponibilidad".</strong> En la máxima medida permitida por la ley:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>No garantizamos que el servicio sea libre de errores o que cumpla con todos tus requerimientos específicos.</li>
                <li>No somos responsables por daños indirectos, incidentales, especiales o consecuentes derivados del uso o imposibilidad de uso del servicio.</li>
                <li>No somos responsables por el contenido al que redirigen los códigos QR creados por los usuarios.</li>
                <li>Nuestra responsabilidad total estará limitada al monto efectivamente abonado por el usuario en los últimos 12 meses.</li>
              </ul>
            </Section>

            <Section title="10. Modificaciones al servicio">
              <p>
                Nos reservamos el derecho de modificar, suspender o discontinuar cualquier aspecto del servicio en cualquier momento. En caso de cambios sustanciales que afecten tu suscripción activa, te notificaremos con al menos 30 días de anticipación por correo electrónico.
              </p>
            </Section>

            <Section title="11. Legislación aplicable">
              <p>
                Estos términos se rigen por las leyes de la <strong>República Argentina</strong>. Cualquier controversia derivada del uso de QRapido será sometida a la jurisdicción de los tribunales ordinarios de la Ciudad Autónoma de Buenos Aires, renunciando a cualquier otro fuero que pudiera corresponder.
              </p>
            </Section>

            <Section title="12. Contacto">
              <p>
                Si tenés preguntas sobre estos términos de servicio, podés contactarnos en{" "}
                <a href="mailto:legal@qrapido.com" className="text-primary hover:underline font-medium">legal@qrapido.com</a>.
              </p>
            </Section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-foreground mb-3">{title}</h2>
      <div className="text-muted-foreground">{children}</div>
    </section>
  );
}

export default Terms;
