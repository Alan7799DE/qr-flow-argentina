import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useAdmin";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
    staleTime: 1000 * 60 * 2,
  });

  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();

  const isLoading = sessionLoading || adminLoading;

  useEffect(() => {
    if (sessionLoading) return;
    if (!session) {
      navigate("/auth", { replace: true });
      return;
    }
    if (!adminLoading && isAdmin === false) {
      toast({
        variant: "destructive",
        title: "Acceso denegado",
        description: "No tenés permisos de administrador.",
      });
      navigate("/dashboard", { replace: true });
    }
  }, [session, sessionLoading, isAdmin, adminLoading, navigate, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session || !isAdmin) return null;

  return <>{children}</>;
}
