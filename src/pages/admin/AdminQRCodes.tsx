import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { QrCode, ExternalLink, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const statusColors: Record<string, string> = {
  trial_active: "bg-warning/10 text-warning",
  active: "bg-success/10 text-success",
  paused: "bg-muted text-muted-foreground",
  expired: "bg-destructive/10 text-destructive",
};

const statusLabels: Record<string, string> = {
  trial_active: "Trial",
  active: "Activo",
  paused: "Pausado",
  expired: "Vencido",
};

interface AdminQR {
  id: string;
  name: string;
  slug: string;
  destination_url: string;
  status: string;
  total_scans_cached: number;
  created_at: string;
  user_id: string;
  profiles: { email: string; full_name: string | null } | null;
}

function useAdminQRCodes() {
  return useQuery({
    queryKey: ["admin-qr-codes"],
    queryFn: async () => {
      // Admin RLS allows viewing all QR codes
      const { data, error } = await supabase
        .from("qr_codes")
        .select("id, name, slug, destination_url, status, total_scans_cached, created_at, user_id, profiles!qr_codes_user_id_fkey(email, full_name)")
        .order("created_at", { ascending: false });

      if (error) {
        // Fallback without join if FK doesn't exist
        const { data: qrs, error: qrError } = await supabase
          .from("qr_codes")
          .select("id, name, slug, destination_url, status, total_scans_cached, created_at, user_id")
          .order("created_at", { ascending: false });

        if (qrError) throw qrError;

        // Fetch profiles separately
        const userIds = [...new Set(qrs?.map((q) => q.user_id) || [])];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, email, full_name")
          .in("user_id", userIds);

        const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

        return (qrs || []).map((qr) => ({
          ...qr,
          profiles: profileMap.get(qr.user_id) || null,
        })) as AdminQR[];
      }

      return (data || []).map((d: any) => ({
        ...d,
        profiles: Array.isArray(d.profiles) ? d.profiles[0] || null : d.profiles,
      })) as AdminQR[];
    },
  });
}

export default function AdminQRCodes() {
  const { data: qrCodes, isLoading } = useAdminQRCodes();
  const [search, setSearch] = useState("");

  const filtered = qrCodes?.filter((qr) => {
    const term = search.toLowerCase();
    return (
      qr.name.toLowerCase().includes(term) ||
      qr.destination_url.toLowerCase().includes(term) ||
      qr.profiles?.email.toLowerCase().includes(term) ||
      qr.profiles?.full_name?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
          Códigos QR
        </h1>
        <p className="text-muted-foreground mt-1">
          Todos los QRs creados en la plataforma
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, URL o usuario..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            QRs ({filtered?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !filtered || filtered.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {search ? "No se encontraron resultados" : "No hay QRs creados"}
            </p>
          ) : (
            <div className="divide-y">
              {filtered.map((qr) => (
                <div
                  key={qr.id}
                  className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <QrCode className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {qr.name}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <a
                          href={qr.destination_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate max-w-[200px] hover:text-primary flex items-center gap-1"
                        >
                          {qr.destination_url}
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Creado por:{" "}
                        <span className="font-medium">
                          {qr.profiles?.full_name || qr.profiles?.email || "Desconocido"}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="font-medium text-foreground">
                        {qr.total_scans_cached}
                      </p>
                      <p className="text-xs text-muted-foreground">escaneos</p>
                    </div>
                    <Badge className={statusColors[qr.status] || "bg-muted text-muted-foreground"}>
                      {statusLabels[qr.status] || qr.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground hidden md:block">
                      {new Date(qr.created_at).toLocaleDateString("es-AR")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
