import { SEOHead } from "@/components/SEOHead";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

const Privacy = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="Política de Privacidad"
        description="Política de privacidad de QRapido. Conocé cómo recopilamos, usamos y protegemos tus datos personales."
        canonical="/privacy"
      />
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">Política de Privacidad</h1>
          <p className="text-muted-foreground mb-10">Última actualización: 17 de marzo de 2026</p>

          <div className="space-y-8 text-foreground/90 leading-relaxed">
            <Section title="1. Introducción">
              <p>
                En <strong>QRapido</strong> nos comprometemos a proteger tu privacidad. Esta política describe qué datos recopilamos, cómo los usamos y cuáles son tus derechos como usuario. Al utilizar nuestro servicio, aceptás los términos aquí descriptos.
              </p>
            </Section>

            <Section title="2. Datos que recopilamos">
              <p>Recopilamos los siguientes tipos de información:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li><strong>Datos de cuenta:</strong> nombre completo y dirección de correo electrónico, obtenidos al registrarte (incluyendo mediante Google OAuth).</li>
                <li><strong>Datos de uso de QR:</strong> cantidad de escaneos, fechas de escaneo, tipo de dispositivo y sistema operativo del escáner.</li>
                <li><strong>Datos de suscripción:</strong> plan activo, estado de la suscripción y fechas de vigencia.</li>
                <li><strong>Datos técnicos:</strong> dirección IP (para redirección de QR), user agent del navegador y referrer.</li>
              </ul>
            </Section>

            <Section title="3. Cómo usamos tus datos">
              <ul className="list-disc pl-6 space-y-1">
                <li>Proveer y mantener el servicio de códigos QR dinámicos.</li>
                <li>Generar estadísticas y analytics de escaneos para tu panel de control.</li>
                <li>Gestionar tu cuenta y suscripción.</li>
                <li>Enviar comunicaciones transaccionales (confirmación de cuenta, cambios de contraseña, notificaciones de vencimiento de trial).</li>
                <li>Mejorar la plataforma y la experiencia de usuario.</li>
              </ul>
            </Section>

            <Section title="4. Compartición de datos">
              <p>
                <strong>No vendemos, alquilamos ni compartimos tus datos personales con terceros</strong> con fines comerciales o publicitarios. Solo compartimos información con los siguientes proveedores de servicios estrictamente necesarios para operar la plataforma:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li><strong>Infraestructura cloud:</strong> utilizamos servicios de infraestructura en la nube para almacenar y procesar datos de forma segura.</li>
                <li><strong>Emails transaccionales:</strong> utilizamos un servicio de envío de correos para comunicaciones relacionadas con tu cuenta.</li>
                <li><strong>Procesamiento de pagos:</strong> Mercado Pago procesa las transacciones de suscripción. No almacenamos datos de tarjetas de crédito.</li>
              </ul>
            </Section>

            <Section title="5. Seguridad de los datos">
              <p>
                Implementamos medidas de seguridad técnicas y organizativas para proteger tus datos, incluyendo:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Cifrado en tránsito (HTTPS/TLS) y en reposo.</li>
                <li>Políticas de acceso a nivel de fila (Row Level Security) en la base de datos.</li>
                <li>Autenticación segura con tokens JWT.</li>
                <li>Acceso restringido a datos según roles de usuario.</li>
              </ul>
            </Section>

            <Section title="6. Retención de datos">
              <p>
                Conservamos tus datos mientras tu cuenta esté activa. Los códigos QR eliminados se mueven a una papelera y se eliminan definitivamente después de un período configurable. Si solicitás la eliminación de tu cuenta, eliminaremos todos tus datos personales de nuestros sistemas.
              </p>
            </Section>

            <Section title="7. Tus derechos">
              <p>
                De acuerdo con la Ley de Protección de Datos Personales N° 25.326 de la República Argentina, tenés derecho a:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li><strong>Acceso:</strong> solicitar información sobre los datos que tenemos sobre vos.</li>
                <li><strong>Rectificación:</strong> corregir datos inexactos o incompletos.</li>
                <li><strong>Supresión:</strong> solicitar la eliminación de tus datos personales.</li>
                <li><strong>Oposición:</strong> oponerte al tratamiento de tus datos en determinados casos.</li>
              </ul>
              <p className="mt-2">
                Para ejercer estos derechos, contactanos a <a href="mailto:privacidad@qrapido.com" className="text-primary hover:underline font-medium">privacidad@qrapido.com</a>.
              </p>
            </Section>

            <Section title="8. Cookies y tecnologías similares">
              <p>
                Utilizamos almacenamiento local del navegador (localStorage) exclusivamente para gestionar tu sesión de usuario. No utilizamos cookies de terceros ni tecnologías de rastreo publicitario.
              </p>
            </Section>

            <Section title="9. Menores de edad">
              <p>
                Nuestro servicio no está dirigido a menores de 18 años. No recopilamos intencionalmente datos de menores. Si tomamos conocimiento de que hemos recopilado datos de un menor, los eliminaremos de inmediato.
              </p>
            </Section>

            <Section title="10. Cambios a esta política">
              <p>
                Podemos actualizar esta política periódicamente. Te notificaremos sobre cambios significativos a través del correo electrónico asociado a tu cuenta. La fecha de última actualización se indica al inicio de este documento.
              </p>
            </Section>

            <Section title="11. Contacto">
              <p>
                Si tenés preguntas sobre esta política de privacidad, podés contactarnos en{" "}
                <a href="mailto:privacidad@qrapido.com" className="text-primary hover:underline font-medium">privacidad@qrapido.com</a>.
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

export default Privacy;
