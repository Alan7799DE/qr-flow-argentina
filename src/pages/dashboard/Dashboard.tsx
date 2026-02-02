import { QrCode, TrendingUp, Eye, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

// Placeholder data - will be replaced with real data from database
const stats = [
  { label: "QRs activos", value: "0", icon: QrCode, color: "primary" },
  { label: "Escaneos hoy", value: "0", icon: Eye, color: "accent" },
  { label: "Escaneos 7 días", value: "0", icon: TrendingUp, color: "success" },
  { label: "Próximo vencimiento", value: "-", icon: Clock, color: "warning" },
];

export default function Dashboard() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Bienvenido a tu panel de control de QRs
          </p>
        </div>
        <Button variant="hero" asChild>
          <Link to="/dashboard/create">
            <QrCode className="w-4 h-4" />
            Crear nuevo QR
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-card rounded-xl border p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                stat.color === "primary" ? "bg-primary/10 text-primary" :
                stat.color === "accent" ? "bg-accent/10 text-accent" :
                stat.color === "success" ? "bg-success/10 text-success" :
                "bg-warning/10 text-warning"
              }`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Empty state */}
      <div className="bg-card rounded-xl border p-12 text-center">
        <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-6 shadow-lg">
          <QrCode className="w-8 h-8 text-primary-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Creá tu primer QR
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto mb-6">
          Empezá a trackear escaneos y optimizar tus campañas con QRs dinámicos.
        </p>
        <Button variant="hero" size="lg" asChild>
          <Link to="/dashboard/create">
            Crear QR ahora
          </Link>
        </Button>
      </div>

      {/* Recent QRs placeholder */}
      <div className="bg-card rounded-xl border">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-foreground">Mis QRs</h2>
        </div>
        <div className="p-6 text-center text-muted-foreground">
          <p>No tenés QRs creados todavía.</p>
        </div>
      </div>
    </div>
  );
}
