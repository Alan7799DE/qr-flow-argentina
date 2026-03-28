import { Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { NavLink } from "@/components/NavLink";
import { 
  LayoutDashboard, 
  Users, 
  UserX,
  CreditCard, 
  Settings, 
  Webhook,
  LogOut,
  QrCode
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const navItems = [
    { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
    { to: "/admin/users", icon: Users, label: "Usuarios" },
    { to: "/admin/deleted-users", icon: UserX, label: "Eliminados" },
    { to: "/admin/qr-codes", icon: QrCode, label: "Códigos QR" },
    { to: "/admin/plans", icon: CreditCard, label: "Planes" },
    { to: "/admin/config", icon: Settings, label: "Configuración" },
    { to: "/admin/webhooks", icon: Webhook, label: "Webhooks" },
  ];

  return (
    <div className="min-h-screen flex w-full bg-muted/30">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r flex flex-col">
        <div className="p-4 border-b">
          <Link to="/admin" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
              <QrCode className="w-5 h-5 text-destructive" />
            </div>
            <span className="font-bold text-foreground">QRapido Admin</span>
          </Link>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
              activeClassName="bg-destructive/10 text-destructive font-medium"
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-2 border-t space-y-1">
          <Link
            to="/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          >
            <LayoutDashboard className="w-5 h-5" />
            Ir al Dashboard
          </Link>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5" />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
