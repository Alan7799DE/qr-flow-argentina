import { useAdminUsers, useAdminPlans, useWebhookLogs } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CreditCard, QrCode, Webhook, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboard() {
  const { data, isLoading: loadingUsers } = useAdminUsers({ limit: 5 });
  const { data: plans, isLoading: loadingPlans } = useAdminPlans();
  const { data: webhooks, isLoading: loadingWebhooks } = useWebhookLogs();

  const users = data?.users || [];
  const totalUsers = data?.meta?.total || 0;

  const activeSubscriptions = users.filter(
    (u) => u.subscription?.status === "active"
  ).length || 0;

  const recentWebhooks = webhooks?.filter(
    (w) => new Date(w.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
  ).length || 0;

  const stats = [
    {
      title: "Total Usuarios",
      value: totalUsers,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Suscripciones Activas",
      value: activeSubscriptions,
      icon: CreditCard,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Planes Ofrecidos",
      value: plans?.filter((p) => p.is_active).length || 0,
      icon: TrendingUp,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Webhooks (24h)",
      value: recentWebhooks,
      icon: Webhook,
      color: "text-info",
      bgColor: "bg-info/10",
    },
  ];

  const isLoading = loadingUsers || loadingPlans || loadingWebhooks;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
          Panel de Administración
        </h1>
        <p className="text-muted-foreground mt-1">
          Gestión centralizada de QRapido
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  )}
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Usuarios Recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {users.slice(0, 5).map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {user.full_name || user.email}
                      </p>
                      {user.full_name && (
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString("es-AR")}
                    </span>
                  </div>
                ))}
                {(!users || users.length === 0) && (
                  <p className="text-muted-foreground text-center py-4">
                    No hay usuarios registrados
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="w-5 h-5" />
              Webhooks Recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingWebhooks ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {webhooks?.slice(0, 5).map((webhook) => (
                  <div
                    key={webhook.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-foreground">{webhook.event_type}</p>
                      <p className="text-sm text-muted-foreground">{webhook.provider}</p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs ${
                          webhook.processed
                            ? "bg-success/10 text-success"
                            : "bg-warning/10 text-warning"
                        }`}
                      >
                        {webhook.processed ? "Procesado" : "Pendiente"}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(webhook.created_at).toLocaleString("es-AR")}
                      </p>
                    </div>
                  </div>
                ))}
                {(!webhooks || webhooks.length === 0) && (
                  <p className="text-muted-foreground text-center py-4">
                    No hay webhooks registrados
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
