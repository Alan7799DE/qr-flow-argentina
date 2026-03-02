import { useEffect, useState } from "react";
import { Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { 
  QrCode, 
  LayoutDashboard, 
  Plus, 
  CreditCard, 
  Settings, 
  LogOut,
  Menu,
  X,
  Shield,
  Trash2,
  AlertTriangle,
  BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useIsAdmin } from "@/hooks/useAdmin";
import { useSubscription } from "@/hooks/useSubscription";

const navItems = [
  { icon: LayoutDashboard, label: "Mis QRs", path: "/dashboard" },
  { icon: Plus, label: "Crear QR", path: "/dashboard/create" },
  { icon: BarChart3, label: "Estadísticas", path: "/dashboard/stats" },
  { icon: CreditCard, label: "Facturación", path: "/dashboard/billing" },
  { icon: Settings, label: "Configuración", path: "/dashboard/settings" },
  { icon: Trash2, label: "Papelera", path: "/dashboard/trash" },
];

function PaymentFailedBanner() {
  const { data: subscription } = useSubscription();

  if (!subscription || subscription.status !== 'paused' || !subscription.grace_period_ends_at) {
    return null;
  }

  const graceEnd = new Date(subscription.grace_period_ends_at);
  const now = new Date();
  const hoursLeft = Math.max(0, Math.ceil((graceEnd.getTime() - now.getTime()) / (1000 * 60 * 60)));
  const minutesLeft = Math.max(0, Math.ceil((graceEnd.getTime() - now.getTime()) / (1000 * 60)));

  const timeText = hoursLeft > 1 
    ? `${hoursLeft} horas` 
    : minutesLeft > 0 
      ? `${minutesLeft} minutos` 
      : 'poco tiempo';

  return (
    <div className="mb-6 rounded-xl border border-warning/30 bg-warning/5 p-4 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-semibold text-foreground">
          Problema con tu pago
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          No pudimos procesar el cobro de tu suscripción. Tus QRs seguirán activos por <strong className="text-foreground">{timeText}</strong> más. 
          Después de ese plazo se desactivarán automáticamente.
        </p>
        <Button variant="outline" size="sm" className="mt-3 border-warning/50 text-warning hover:bg-warning/10" asChild>
          <Link to="/dashboard/billing">Ver facturación</Link>
        </Button>
      </div>
    </div>
  );
}

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { data: isAdmin } = useIsAdmin();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
      
      if (!session?.user) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
      
      if (!session?.user) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Sesión cerrada",
      description: "Hasta pronto!",
    });
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b z-50 flex items-center justify-between px-4">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
            <QrCode className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-foreground">QRapido</span>
        </Link>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 text-foreground"
          aria-label={isSidebarOpen ? "Cerrar menú lateral" : "Abrir menú lateral"}
          aria-expanded={isSidebarOpen}
        >
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-sidebar transform transition-transform duration-300 lg:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center gap-2 px-6 border-b border-sidebar-border">
            <div className="w-9 h-9 rounded-lg gradient-bg flex items-center justify-center">
              <QrCode className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-sidebar-foreground">QRapido</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-6 px-4 space-y-1" aria-label="Dashboard">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
            
            {/* Admin link */}
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors mt-4 border-t border-sidebar-border pt-4 text-destructive hover:bg-destructive/10"
              >
                <Shield className="w-5 h-5" />
                <span className="font-medium">Panel Admin</span>
              </Link>
            )}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3 px-4 py-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center">
                <span className="text-sm font-medium text-sidebar-foreground">
                  {user.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {user.email}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-3" />
              Cerrar sesión
            </Button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
          role="presentation"
          aria-hidden="true"
        />
      )}

      {/* Main content */}
      <main className="lg:pl-64 pt-16 lg:pt-0 min-h-screen">
        <div className="p-6 lg:p-8">
          <PaymentFailedBanner />
          <Outlet />
        </div>
      </main>
    </div>
  );
}
