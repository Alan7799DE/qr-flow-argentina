import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

// Get Supabase URL from environment
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://pktcejvlpocglkrsjnow.supabase.co";

export default function RedirectPage() {
  const { slug } = useParams<{ slug: string }>();

  useEffect(() => {
    if (!slug) return;

    // Redirect directly to the edge function for proper analytics tracking
    // The edge function handles: status check, scan recording, UTM params, and final redirect
    const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/redirect/${slug}`;
    window.location.href = edgeFunctionUrl;
  }, [slug]);

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Redirigiendo...</p>
      </div>
    </div>
  );
}
