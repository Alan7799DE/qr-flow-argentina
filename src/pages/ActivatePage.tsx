import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { QrCode, AlertCircle, LogIn, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";

interface QRInfo {
  id: string;
  name: string;
  status: string;
  user_id: string;
}

export default function ActivatePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [qr, setQr] = useState<QRInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActivating, setIsActivating] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      // Get user
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      // Get QR info
      if (slug) {
        const { data, error } = await supabase
          .from("qr_codes")
          .select("id, name, status, user_id")
          .eq("slug", slug)
          .maybeSingle();

        if (error || !data) {
          setNotFound(true);
        } else {
          setQr(data);
        }
      }

      setIsLoading(false);
    };

    loadData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [slug]);

  const handleActivate = async () => {
    if (!qr) return;

    setIsActivating(true);
    try {
      const { error } = await supabase
        .from("qr_codes")
        .update({ status: "active" })
        .eq("id", qr.id);

      if (error) throw error;

      toast({
        title: "¡QR reactivado!",
        description: "Tu código QR está activo nuevamente.",
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo reactivar el QR.",
      });
    } finally {
      setIsActivating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl shadow-xl border p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">QR no encontrado</h1>
          <p className="text-muted-foreground mb-6">
            El código QR que buscás no existe o fue eliminado.
          </p>
          <Button variant="outline" asChild>
            <Link to="/">Ir al inicio</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isOwner = user && qr && user.id === qr.user_id;

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/4 w-[600px] h-[600px] rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="bg-card rounded-2xl shadow-xl border p-8 max-w-md w-full text-center relative">
        {/* Logo */}
        <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-6 shadow-lg">
          <QrCode className="w-8 h-8 text-primary-foreground" />
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">
          QR Desactivado
        </h1>

        {qr && (
          <p className="text-lg text-muted-foreground mb-6">
            "{qr.name}"
          </p>
        )}

        {!user ? (
          // Not logged in
          <>
            <p className="text-muted-foreground mb-6">
              Este código QR está desactivado. Iniciá sesión con la cuenta propietaria para reactivarlo.
            </p>
            <div className="flex flex-col gap-3">
              <Button variant="hero" asChild>
                <Link to={`/auth?redirect=/activate/${slug}`}>
                  <LogIn className="w-4 h-4" />
                  Iniciar sesión
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to={`/auth?mode=signup&redirect=/activate/${slug}`}>
                  Crear cuenta
                </Link>
              </Button>
            </div>
          </>
        ) : !isOwner ? (
          // Logged in but not owner
          <>
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <p className="text-muted-foreground mb-6">
              No tenés permiso para reactivar este QR. 
              Solo el propietario puede hacerlo.
            </p>
            <Button variant="outline" asChild>
              <Link to="/dashboard">Ir a mi dashboard</Link>
            </Button>
          </>
        ) : qr?.status === "paused" ? (
          // Owner and QR is paused
          <>
            <p className="text-muted-foreground mb-6">
              Pausaste este QR manualmente. ¿Querés reactivarlo?
            </p>
            <Button 
              variant="hero" 
              onClick={handleActivate}
              disabled={isActivating}
            >
              {isActivating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Reactivando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Reactivar QR
                </>
              )}
            </Button>
          </>
        ) : (
          // Owner but subscription needed
          <>
            <p className="text-muted-foreground mb-6">
              Tu período de prueba terminó o tu suscripción venció. 
              Suscribite a un plan para reactivar este QR.
            </p>
            <div className="flex flex-col gap-3">
              <Button variant="hero" asChild>
                <Link to="/dashboard/billing">Ver planes</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/dashboard">Ir al dashboard</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
