import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function RedirectPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleRedirect = async () => {
      if (!slug) {
        setError("URL inválida");
        return;
      }

      try {
        // Call the edge function
        const response = await supabase.functions.invoke("redirect", {
          body: { slug },
        });

        // The edge function handles the redirect via 302, but since we're calling
        // it via the SDK, we get the response data instead. 
        // We need to handle the redirect client-side.
        
        // Actually, for QR scans, users will hit the edge function URL directly,
        // not through this React page. This page is just a fallback.
        
        // Fetch QR info directly
        const { data: qr, error: qrError } = await supabase
          .from("qr_codes")
          .select("destination_url, status, utm_source, utm_medium, utm_campaign")
          .eq("slug", slug)
          .maybeSingle();

        if (qrError || !qr) {
          setError("QR no encontrado");
          return;
        }

        if (qr.status === "paused" || qr.status === "expired") {
          navigate(`/activate/${slug}`);
          return;
        }

        // Build final URL with UTMs
        let destinationUrl = qr.destination_url;
        try {
          const url = new URL(destinationUrl);
          if (qr.utm_source) url.searchParams.set("utm_source", qr.utm_source);
          if (qr.utm_medium) url.searchParams.set("utm_medium", qr.utm_medium);
          if (qr.utm_campaign) url.searchParams.set("utm_campaign", qr.utm_campaign);
          destinationUrl = url.toString();
        } catch {
          // Use original URL if parsing fails
        }

        // Redirect
        window.location.href = destinationUrl;
      } catch (err) {
        console.error("Redirect error:", err);
        setError("Error al procesar el QR");
      }
    };

    handleRedirect();
  }, [slug, navigate]);

  if (error) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Redirigiendo...</p>
      </div>
    </div>
  );
}
