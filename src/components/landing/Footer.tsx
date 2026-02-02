import { Link } from "react-router-dom";
import { QrCode } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-foreground text-background py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-lg gradient-bg flex items-center justify-center">
                <QrCode className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">QRapido</span>
            </Link>
            <p className="text-background/60 max-w-sm">
              La plataforma más simple para crear QRs dinámicos con analytics. 
              Hecha en Argentina para negocios que quieren medir resultados.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">Producto</h4>
            <ul className="space-y-3 text-background/60">
              <li><a href="#features" className="hover:text-background transition-colors">Funciones</a></li>
              <li><a href="#pricing" className="hover:text-background transition-colors">Precios</a></li>
              <li><a href="#faq" className="hover:text-background transition-colors">FAQ</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-3 text-background/60">
              <li><Link to="/terms" className="hover:text-background transition-colors">Términos de uso</Link></li>
              <li><Link to="/privacy" className="hover:text-background transition-colors">Privacidad</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-background/10 text-center text-sm text-background/40">
          © {new Date().getFullYear()} QRapido. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}
