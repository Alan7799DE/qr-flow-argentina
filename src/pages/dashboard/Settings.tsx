import { useEffect, useState } from "react";
import { SEOHead } from "@/components/SEOHead";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function SettingsPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const handleDeleteAccount = async () => {
    if (!user) return;
    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        method: "DELETE",
        body: { user_id: user.id },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      await supabase.auth.signOut();
      toast({ title: "Cuenta eliminada", description: "Tu cuenta fue eliminada permanentemente." });
      navigate("/");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message || "No se pudo eliminar la cuenta." });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      <SEOHead title="Configuración" description="Configurá tu cuenta y preferencias en QRapido." noindex />
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Configuración</h1>
        <p className="text-muted-foreground mt-1">Gestioná tu cuenta y preferencias</p>
      </div>

      {/* Account Info */}
      <div className="bg-card rounded-xl border p-6 space-y-6">
        <h2 className="text-lg font-semibold text-foreground">Información de cuenta</h2>

        <div className="space-y-2">
          <Label htmlFor="settings-email">Email</Label>
          <Input id="settings-email" value={user?.email || ""} disabled />
          <p className="text-sm text-muted-foreground">Tu email no puede ser modificado</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="settings-created">Cuenta creada</Label>
          <Input
            id="settings-created"
            value={user?.created_at ? new Date(user.created_at).toLocaleDateString("es-AR") : ""}
            disabled
          />
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-card rounded-xl border border-destructive/20 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-destructive">Zona de peligro</h2>
        <p className="text-sm text-muted-foreground">
          Al eliminar tu cuenta se borrarán permanentemente todos tus QRs, escaneos y datos asociados. Esta acción no se puede deshacer.
        </p>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              Eliminar cuenta
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Se eliminará tu cuenta <strong>{user?.email}</strong> junto con todos tus QRs, escaneos y datos. Esta acción es permanente e irreversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Sí, eliminar mi cuenta
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
