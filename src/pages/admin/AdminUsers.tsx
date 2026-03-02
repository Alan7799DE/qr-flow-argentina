import { useAdminUsers } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Users, Search, QrCode, Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminUsers() {
  const { data: users, isLoading } = useAdminUsers();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; email: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const filteredUsers = users?.filter(
    (user) =>
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        method: "DELETE",
        body: { user_id: deleteTarget.id },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Usuario eliminado", description: `Se eliminó ${deleteTarget.email} correctamente.` });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message || "No se pudo eliminar el usuario." });
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Usuarios</h1>
        <p className="text-muted-foreground mt-1">Gestión de usuarios registrados</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por email o nombre..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {isLoading ? "Cargando..." : `${filteredUsers?.length || 0} usuarios`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-muted-foreground">Usuario</th>
                    <th className="pb-3 font-medium text-muted-foreground">QRs</th>
                    <th className="pb-3 font-medium text-muted-foreground">Plan</th>
                    <th className="pb-3 font-medium text-muted-foreground">Estado</th>
                    <th className="pb-3 font-medium text-muted-foreground">Registro</th>
                    <th className="pb-3 font-medium text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredUsers?.map((user) => {
                    const sub = user.subscription;
                    const qrCount = user.qr_count || 0;

                    return (
                      <tr key={user.id} className="hover:bg-muted/50">
                        <td className="py-4">
                          <div>
                            <p className="font-medium text-foreground">{user.full_name || user.email}</p>
                            {user.full_name && <p className="text-sm text-muted-foreground">{user.email}</p>}
                          </div>
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-1.5">
                            <QrCode className="w-4 h-4 text-muted-foreground" />
                            <span>{qrCount}</span>
                          </div>
                        </td>
                        <td className="py-4">
                          {sub?.plan_name ? (
                            <span className="font-medium">{sub.plan_name}</span>
                          ) : (
                            <span className="text-muted-foreground">Trial</span>
                          )}
                        </td>
                        <td className="py-4">
                          {sub?.status === "active" ? (
                            <Badge variant="default" className="bg-success text-success-foreground">Activo</Badge>
                          ) : (
                            <Badge variant="outline">Sin plan</Badge>
                          )}
                        </td>
                        <td className="py-4 text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString("es-AR")}
                        </td>
                        <td className="py-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteTarget({ id: user.user_id, email: user.email })}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredUsers?.length === 0 && (
                <p className="text-center py-8 text-muted-foreground">No se encontraron usuarios</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará permanentemente a <strong>{deleteTarget?.email}</strong> junto con todos sus QRs, escaneos y datos asociados. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
