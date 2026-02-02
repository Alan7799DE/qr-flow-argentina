import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  return (
    <div className="max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Configuración</h1>
        <p className="text-muted-foreground mt-1">
          Gestioná tu cuenta y preferencias
        </p>
      </div>

      {/* Account Info */}
      <div className="bg-card rounded-xl border p-6 space-y-6">
        <h2 className="text-lg font-semibold text-foreground">Información de cuenta</h2>
        
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={user?.email || ""} disabled />
          <p className="text-sm text-muted-foreground">
            Tu email no puede ser modificado
          </p>
        </div>

        <div className="space-y-2">
          <Label>Cuenta creada</Label>
          <Input 
            value={user?.created_at ? new Date(user.created_at).toLocaleDateString("es-AR") : ""} 
            disabled 
          />
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-card rounded-xl border border-destructive/20 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-destructive">Zona de peligro</h2>
        <p className="text-sm text-muted-foreground">
          Estas acciones son irreversibles. Procedé con cuidado.
        </p>
        <Button variant="destructive" size="sm">
          Eliminar cuenta
        </Button>
      </div>
    </div>
  );
}
