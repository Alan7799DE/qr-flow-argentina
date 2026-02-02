import { useAdminUsers, AdminUser } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Users, Search, QrCode } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export default function AdminUsers() {
  const { data: users, isLoading } = useAdminUsers();
  const [search, setSearch] = useState("");

  // Get QR counts for all users
  const { data: qrCounts } = useQuery({
    queryKey: ["admin-qr-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("qr_codes")
        .select("user_id");

      if (error) throw error;

      const counts: Record<string, number> = {};
      data.forEach((qr) => {
        counts[qr.user_id] = (counts[qr.user_id] || 0) + 1;
      });
      return counts;
    },
  });

  const filteredUsers = users?.filter(
    (user) =>
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Usuarios</h1>
        <p className="text-muted-foreground mt-1">
          Gestión de usuarios registrados
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por email o nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Users Table */}
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
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredUsers?.map((user) => {
                    const sub = user.subscription;
                    const qrCount = qrCounts?.[user.user_id] || 0;

                    return (
                      <tr key={user.id} className="hover:bg-muted/50">
                        <td className="py-4">
                          <div>
                            <p className="font-medium text-foreground">
                              {user.full_name || "Sin nombre"}
                            </p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
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
                            <Badge variant="default" className="bg-success text-success-foreground">
                              Activo
                            </Badge>
                          ) : sub?.status === "pending" ? (
                            <Badge variant="secondary" className="bg-warning/10 text-warning">
                              Pendiente
                            </Badge>
                          ) : (
                            <Badge variant="outline">Sin plan</Badge>
                          )}
                        </td>
                        <td className="py-4 text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString("es-AR")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredUsers?.length === 0 && (
                <p className="text-center py-8 text-muted-foreground">
                  No se encontraron usuarios
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
