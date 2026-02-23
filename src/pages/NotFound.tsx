import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { SEOHead } from "@/components/SEOHead";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted">
      <SEOHead
        title="Página no encontrada"
        description="La página que buscás no existe o fue movida."
        noindex
      />
      <div className="text-center max-w-md px-4">
        <h1 className="mb-2 text-6xl font-bold text-foreground">404</h1>
        <p className="mb-6 text-xl text-muted-foreground">
          La página que buscás no existe o fue movida.
        </p>
        <Button variant="hero" asChild>
          <Link to="/">
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio
          </Link>
        </Button>
      </div>
    </main>
  );
};

export default NotFound;