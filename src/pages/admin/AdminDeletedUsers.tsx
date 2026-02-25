import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { UserX, QrCode } from "lucide-react";

interface DeletedUserLog {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  qr_count: number;
  deleted_by: string;
  deleted_by_email: string;
  reason: string;
  deleted_at: string;
}

function useDeletedUsersLog() {
  return useQuery({
    queryKey: ["deleted-users-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deleted_users_log")
        .select("*")
        .order("deleted_at", { ascending: false });
      if (error) throw error;
      return data as DeletedUserLog[];
    },
  });
}

export default function AdminDeletedUsers() {
  const { data: logs, isLoading } = useDeletedUsersLog();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Usuarios eliminados</h1>
        <p className="text-muted-foreground mt-1">Registro de usuarios dados de baja</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserX className="w-5 h-5" />
            {isLoading ? "Cargando..." : `${logs?.length || 0} registros`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !logs || logs.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No hay usuarios eliminados</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-muted-foreground">Usuario</th>
                    <th className="pb-3 font-medium text-muted-foreground">QRs</th>
                    <th className="pb-3 font-medium text-muted-foreground">Motivo</th>
                    <th className="pb-3 font-medium text-muted-foreground">Eliminado por</th>
                    <th className="pb-3 font-medium text-muted-foreground">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/50">
                      <td className="py-4">
                        <div>
                          <p className="font-medium text-foreground">{log.full_name || log.email}</p>
                          {log.full_name && <p className="text-sm text-muted-foreground">{log.email}</p>}
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-1.5">
                          <QrCode className="w-4 h-4 text-muted-foreground" />
                          <span>{log.qr_count}</span>
                        </div>
                      </td>
                      <td className="py-4">
                        {log.reason === "self_delete" ? (
                          <Badge variant="outline">Auto-eliminación</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-destructive/10 text-destructive">Admin</Badge>
                        )}
                      </td>
                      <td className="py-4 text-sm text-muted-foreground">{log.deleted_by_email}</td>
                      <td className="py-4 text-muted-foreground">
                        {new Date(log.deleted_at).toLocaleString("es-AR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
