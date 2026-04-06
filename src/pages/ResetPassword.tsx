import { useState, useEffect } from "react";
import { SEOHead } from "@/components/SEOHead";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QrCode, ArrowLeft, Loader2, Eye, EyeOff, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const passwordSchema = z.string().min(6, "La contraseña debe tener al menos 6 caracteres");

export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});

  useEffect(() => {
    // Check for recovery event from the URL hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsValidSession(true);
        setIsChecking(false);
      } else if (session) {
        // User has a valid session (could be from recovery link)
        setIsValidSession(true);
        setIsChecking(false);
      }
    });

    // Also check hash for type=recovery
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      // Supabase will handle the token exchange via onAuthStateChange
      setTimeout(() => {
        setIsChecking(false);
      }, 3000);
    } else {
      // Check if there's already a session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setIsValidSession(true);
        }
        setIsChecking(false);
      });
    }

    return () => subscription.unsubscribe();
  }, []);

  const validate = () => {
    const newErrors: typeof errors = {};

    const result = passwordSchema.safeParse(password);
    if (!result.success) {
      newErrors.password = result.error.errors[0].message;
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Las contraseñas no coinciden";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      setIsSuccess(true);
      toast({
        title: "¡Contraseña actualizada!",
        description: "Tu contraseña fue cambiada exitosamente.",
      });

      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo actualizar la contraseña.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-1/2 -left-1/4 w-[600px] h-[600px] rounded-full bg-accent/5 blur-3xl" />
        </div>
        <div className="w-full max-w-md relative">
          <div className="bg-card rounded-2xl shadow-xl border p-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-lg gradient-bg flex items-center justify-center shadow-md">
                <QrCode className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold text-foreground">QRapido</span>
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">Enlace inválido o expirado</h1>
            <p className="text-muted-foreground mb-6">
              El enlace para restablecer la contraseña ya no es válido. Solicitá uno nuevo.
            </p>
            <Link to="/auth">
              <Button variant="hero" size="lg" className="w-full">
                Volver al login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/4 w-[600px] h-[600px] rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        <Link
          to="/auth"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al login
        </Link>

        <div className="bg-card rounded-2xl shadow-xl border p-8">
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-lg gradient-bg flex items-center justify-center shadow-md">
              <QrCode className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">QRapido</span>
          </div>

          {isSuccess ? (
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-foreground mb-2">¡Listo!</h1>
              <p className="text-muted-foreground">
                Tu contraseña fue actualizada. Redirigiendo al dashboard...
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-center text-foreground mb-2">
                Nueva contraseña
              </h1>
              <p className="text-center text-muted-foreground mb-8">
                Ingresá tu nueva contraseña
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="password">Nueva contraseña</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={errors.password ? "border-destructive pr-10" : "pr-10"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={errors.confirmPassword ? "border-destructive" : ""}
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="hero"
                  size="lg"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Actualizando...
                    </>
                  ) : (
                    "Actualizar contraseña"
                  )}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
