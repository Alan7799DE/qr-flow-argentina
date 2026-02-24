import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { QrCode, Menu, X } from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header>
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b" aria-label="Navegación principal">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 relative">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-lg gradient-bg flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
              <QrCode className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">QRapido</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
              Funciones
            </a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
              Precios
            </a>
            <a href="#faq" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
              FAQ
            </a>
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/auth">Iniciar sesión</Link>
            </Button>
            <Button variant="gradient" asChild>
              <Link to="/auth?mode=signup">Empezar gratis</Link>
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-foreground"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t animate-fade-in">
            <div className="flex flex-col gap-4">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors font-medium py-2">
                Funciones
              </a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors font-medium py-2">
                Precios
              </a>
              <a href="#faq" className="text-muted-foreground hover:text-foreground transition-colors font-medium py-2">
                FAQ
              </a>
              <div className="flex flex-col gap-2 pt-4 border-t">
                <Button variant="ghost" asChild className="justify-start">
                  <Link to="/auth">Iniciar sesión</Link>
                </Button>
                <Button variant="gradient" asChild>
                  <Link to="/auth?mode=signup">Empezar gratis</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
    </header>
  );
}
