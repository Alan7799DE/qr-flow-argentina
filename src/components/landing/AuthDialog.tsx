import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QrCode, Loader2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const emailSchema = z.string().email("Ingresá un email válido");
const passwordSchema = z.string().min(6, "La contraseña debe tener al menos 6 caracteres");

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthenticated: () => void;
  defaultSignup?: boolean;
}

export function AuthDialog({ open, onOpenChange, onAuthenticated, defaultSignup = true }: AuthDialogProps) {
  const { toast } = useToast();
  const [isSignup, setIsSignup] = useState(defaultSignup);

  useEffect(() => { setIsSignup(defaultSignup); }, [defaultSignup]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const validate = () => {
    const newErrors: typeof errors = {};
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) newErrors.email = emailResult.error.errors[0].message;
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) newErrors.password = passwordResult.error.errors[0].message;
    if (isSignup && password !== confirmPassword) newErrors.confirmPassword = "Las contraseñas no coinciden";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);

    try {
      if (isSignup) {
        try {
          const { data, error: fnError } = await supabase.functions.invoke("validate-email-domain", { body: { email } });
          if (!fnError && data && !data.valid) {
            toast({ variant: "destructive", title: "Email inválido", description: data.error || "El dominio del email no parece aceptar correos." });
            setIsLoading(false);
            return;
          }
        } catch { /* fail-open */ }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });

        if (error) {
          if (error.message.includes("already registered")) {
            toast({ variant: "destructive", title: "Email ya registrado", description: "Este email ya tiene una cuenta. Intentá iniciar sesión." });
          } else throw error;
        } else {
          toast({ title: "¡Cuenta creada!", description: "Bienvenido a QRapido." });
          onAuthenticated();
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast({ variant: "destructive", title: "Credenciales inválidas", description: "Email o contraseña incorrectos." });
          } else throw error;
        } else {
          onAuthenticated();
        }
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Ocurrió un error." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      sessionStorage.setItem("oauth_redirect", "/dashboard");
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (error) {
        toast({ variant: "destructive", title: "Error con Google", description: error.message || "No se pudo iniciar sesión con Google." });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Ocurrió un error." });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      setErrors({ email: emailResult.error.errors[0].message });
      return;
    }
    setErrors({});
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResetSent(true);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "No se pudo enviar el email." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setIsForgotPassword(false);
      setResetSent(false);
      setErrors({});
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg gradient-bg flex items-center justify-center shadow-md">
              <QrCode className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">QRapido</span>
          </div>
          <DialogTitle className="text-center">
            {isForgotPassword ? "Recuperar contraseña" : isSignup ? "Creá tu cuenta" : "Iniciá sesión"}
          </DialogTitle>
          <p className="text-center text-sm text-muted-foreground">
            {isForgotPassword
              ? "Te enviaremos un email para restablecer tu contraseña"
              : isSignup ? "Registrate para descargar tu QR" : "Ingresá para continuar"}
          </p>
        </DialogHeader>

        {isForgotPassword ? (
          resetSent ? (
            <div className="text-center space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Si el email está registrado, te enviamos un link para restablecer tu contraseña. Revisá tu bandeja de entrada.
              </p>
              <Button variant="ghost" onClick={() => { setIsForgotPassword(false); setResetSent(false); }}>
                Volver a iniciar sesión
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dialog-reset-email">Email</Label>
                <Input
                  id="dialog-reset-email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>
              <Button variant="hero" size="lg" className="w-full" onClick={handleForgotPassword} disabled={isLoading}>
                {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Enviando...</> : "Enviar link de recuperación"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                <button type="button" onClick={() => { setIsForgotPassword(false); setErrors({}); }} className="text-primary hover:underline font-medium">
                  Volver a iniciar sesión
                </button>
              </p>
            </div>
          )
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dialog-email">Email</Label>
                <Input
                  id="dialog-email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="dialog-password">Contraseña</Label>
                  {!isSignup && (
                    <button
                      type="button"
                      onClick={() => { setIsForgotPassword(true); setErrors({}); }}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="dialog-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`pr-10 ${errors.password ? "border-destructive" : ""}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              </div>

              {isSignup && (
                <div className="space-y-2">
                  <Label htmlFor="dialog-confirm-password">Confirmar contraseña</Label>
                  <Input
                    id="dialog-confirm-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={errors.confirmPassword ? "border-destructive" : ""}
                  />
                  {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
                </div>
              )}

              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />{isSignup ? "Creando cuenta..." : "Iniciando sesión..."}</>
                ) : isSignup ? "Crear cuenta gratis" : "Iniciar sesión"}
              </Button>
            </form>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">O continuá con</span>
              </div>
            </div>

            <Button type="button" variant="outline" size="lg" className="w-full" onClick={handleGoogleSignIn} disabled={isGoogleLoading || isLoading}>
              {isGoogleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              Continuar con Google
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              {isSignup ? "¿Ya tenés cuenta?" : "¿No tenés cuenta?"}{" "}
              <button type="button" onClick={() => { setIsSignup(!isSignup); setErrors({}); }} className="text-primary hover:underline font-medium">
                {isSignup ? "Iniciá sesión" : "Creá una cuenta"}
              </button>
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
