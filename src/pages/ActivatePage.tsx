import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { QrCode, AlertCircle, Loader2, Check, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";

interface QRInfo {
  id: string;
  name: string;
  status: string;
  user_id: string;
}

/**
 * Visitor (not logged in or not owner): generic "unavailable" message.
 * Owner: full reactivation panel with details.
 * Same message for non-existent and inactive QRs to prevent enumeration.
 */
export default function ActivatePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [qr, setQr] = useState<QRInfo | null>(null);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [hasCancelledSub, setHasCancelledSub] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isActivating, setIsActivating] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      // Only attempt to fetch QR if user is logged in (RLS restricts to owner)
      if (user && slug) {
        const { data } = await supabase
          .from("qr_codes")
          .select("id, name, status, user_id")
          .eq("slug", slug)
          .maybeSingle();

        if (data) {
          setQr(data);
        }

        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("status")
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle();

        setHasSubscription(!!subscription);
      }

      setIsLoading(false);
    };

    loadData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      setUser(session?.user ?? null);

      if (session?.user && slug) {
        const { data } = await supabase
          .from("qr_codes")
          .select("id, name, status, user_id")
          .eq("slug", slug)
          .maybeSingle();

        if (data) {
          setQr(data);
        }

        const { data: sub } = await supabase
          .from("subscriptions")
          .select("status")
          .eq("user_id", session.user.id)
          .eq("status", "active")
          .maybeSingle();

        setHasSubscription(!!sub);
      } else {
        setHasSubscription(false);
        setQr(null);
      }
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

      if (error) {
        if (error.message.includes("row-level security") || error.code === "42501") {
          throw new Error("Necesitás una suscripción activa para reactivar este QR.");
        }
        throw error;
      }

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

  const isOwner = user && qr && user.id === qr.user_id;
  const isPaused = qr?.status === "paused";
  const canReactivate = isOwner && hasSubscription;

  // Visitor view: not logged in, or logged in but not owner
  if (!isOwner) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-1/2 -left-1/4 w-[600px] h-[600px] rounded-full bg-accent/5 blur-3xl" />
        </div>

        <div className="bg-card rounded-2xl shadow-xl border p-8 max-w-md w-full text-center relative">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-8 h-8 text-muted-foreground" />
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-2">
            Enlace no disponible
          </h1>

          <p className="text-muted-foreground mb-6">
            Este código QR no está activo en este momento. 
            Si sos el propietario, iniciá sesión desde tu cuenta para gestionarlo.
          </p>

          <Button variant="outline" asChild>
            <Link to="/">Ir al inicio</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Owner view: logged in and owns this QR
  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/4 w-[600px] h-[600px] rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="bg-card rounded-2xl shadow-xl border p-8 max-w-md w-full text-center relative">
        <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-6 shadow-lg">
          <QrCode className="w-8 h-8 text-primary-foreground" />
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">
          QR Pausado
        </h1>

        <p className="text-lg text-muted-foreground mb-6">
          "{qr.name}"
        </p>

        {isPaused && canReactivate ? (
          <>
            <p className="text-muted-foreground mb-6">
              Este código QR está pausado. ¿Querés reactivarlo?
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
        ) : isPaused && !hasSubscription ? (
          <>
            <p className="text-muted-foreground mb-6">
              Este código QR está pausado porque tu período de prueba finalizó. Suscribite para reactivarlo.
            </p>
            <div className="flex flex-col gap-3">
              <Button variant="hero" asChild>
                <Link to="/dashboard/billing">Suscribirme al Plan Pro</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/dashboard">Ir al dashboard</Link>
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-muted-foreground mb-6">
              Tu suscripción venció. Suscribite al Plan Pro para reactivar este QR.
            </p>
            <div className="flex flex-col gap-3">
              <Button variant="hero" asChild>
                <Link to="/dashboard/billing">Suscribirme al Plan Pro</Link>
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
