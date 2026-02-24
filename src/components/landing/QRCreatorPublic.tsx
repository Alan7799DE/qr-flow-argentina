import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Link2, Download, QrCode, Wand2, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import QRCodeLib from "qrcode";

const PRESET_COLORS = [
  { value: "#000000", label: "Negro" },
  { value: "#2563eb", label: "Azul" },
  { value: "#dc2626", label: "Rojo" },
  { value: "#16a34a", label: "Verde" },
  { value: "#7c3aed", label: "Violeta" },
];

export function QRCreatorPublic() {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [color, setColor] = useState("#000000");
  const [showUtm, setShowUtm] = useState(false);
  const [utmSource, setUtmSource] = useState("");
  const [utmMedium, setUtmMedium] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [qrPreview, setQrPreview] = useState("");

  const buildFinalUrl = useCallback(() => {
    if (!url) return "";
    try {
      const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
      if (utmSource) parsed.searchParams.set("utm_source", utmSource);
      if (utmMedium) parsed.searchParams.set("utm_medium", utmMedium);
      if (utmCampaign) parsed.searchParams.set("utm_campaign", utmCampaign);
      return parsed.toString();
    } catch {
      return "";
    }
  }, [url, utmSource, utmMedium, utmCampaign]);

  useEffect(() => {
    const generate = async () => {
      const finalUrl = buildFinalUrl();
      if (!finalUrl) { setQrPreview(""); return; }
      try {
        const dataUrl = await QRCodeLib.toDataURL(finalUrl, {
          width: 280,
          margin: 2,
          color: { dark: color, light: "#ffffff" },
        });
        setQrPreview(dataUrl);
      } catch {
        setQrPreview("");
      }
    };
    const t = setTimeout(generate, 300);
    return () => clearTimeout(t);
  }, [buildFinalUrl, color]);

  const handleDownload = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      sessionStorage.setItem("pending_qr_url", url);
      sessionStorage.setItem("pending_qr_color", color);
      if (utmSource) sessionStorage.setItem("pending_qr_utm_source", utmSource);
      if (utmMedium) sessionStorage.setItem("pending_qr_utm_medium", utmMedium);
      if (utmCampaign) sessionStorage.setItem("pending_qr_utm_campaign", utmCampaign);
      navigate("/auth?mode=signup&redirect=/dashboard/create");
      return;
    }

    // Logged in – download directly
    const finalUrl = buildFinalUrl();
    if (!finalUrl) return;
    try {
      const dataUrl = await QRCodeLib.toDataURL(finalUrl, {
        width: 1024,
        margin: 2,
        color: { dark: color, light: "#ffffff" },
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "qr-code.png";
      a.click();
    } catch {
      // silent
    }
  };

  return (
    <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl shadow-xl p-6 sm:p-8">
      {/* Badge */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6">
        <Sparkles className="w-3 h-3" />
        Probalo gratis
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form Column */}
        <div className="space-y-5 order-2 lg:order-1">
          {/* URL */}
          <div className="space-y-2">
            <Label htmlFor="public-url" className="text-sm font-medium">URL de destino</Label>
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="public-url"
                type="text"
                placeholder="https://tu-sitio.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="pl-10 h-12 text-base"
              />
            </div>
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Color del QR</Label>
            <div className="flex items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-8 h-8 rounded-full border-2 transition-all duration-200 ${
                    color === c.value
                      ? "border-primary scale-110 shadow-md"
                      : "border-border hover:scale-105"
                  }`}
                  style={{ backgroundColor: c.value }}
                  aria-label={c.label}
                />
              ))}
              <div className="relative ml-1">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-8 h-8 rounded-full cursor-pointer border border-border appearance-none bg-transparent [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0"
                  aria-label="Color personalizado"
                />
              </div>
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-24 h-8 text-xs"
                placeholder="#000000"
                aria-label="Código hex"
              />
            </div>
          </div>

          {/* UTM Toggle */}
          <div className="border-t border-border pt-4">
            <button
              type="button"
              onClick={() => setShowUtm(!showUtm)}
              className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <Wand2 className="w-4 h-4" />
              UTM Builder
              {showUtm ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showUtm && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                <div className="space-y-1">
                  <Label htmlFor="pub-utm-source" className="text-xs">utm_source</Label>
                  <Input id="pub-utm-source" placeholder="google" value={utmSource} onChange={(e) => setUtmSource(e.target.value)} maxLength={255} className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pub-utm-medium" className="text-xs">utm_medium</Label>
                  <Input id="pub-utm-medium" placeholder="qr" value={utmMedium} onChange={(e) => setUtmMedium(e.target.value)} maxLength={255} className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pub-utm-campaign" className="text-xs">utm_campaign</Label>
                  <Input id="pub-utm-campaign" placeholder="verano2024" value={utmCampaign} onChange={(e) => setUtmCampaign(e.target.value)} maxLength={255} className="h-9 text-sm" />
                </div>
              </div>
            )}
          </div>

          {/* Download Button */}
          <Button
            variant="hero"
            size="xl"
            className="w-full"
            onClick={handleDownload}
            disabled={!url}
          >
            <Download className="w-5 h-5" />
            Descargar QR
          </Button>
        </div>

        {/* Preview Column */}
        <div className="flex items-center justify-center order-1 lg:order-2">
          <div
            className={`w-full max-w-[280px] aspect-square rounded-2xl flex items-center justify-center transition-all duration-500 ${
              qrPreview
                ? "bg-white p-4 shadow-glow border border-border/30"
                : "bg-muted/50 border border-dashed border-border"
            }`}
          >
            {qrPreview ? (
              <img
                src={qrPreview}
                alt="Vista previa del código QR"
                className="w-full h-full object-contain animate-fade-in"
              />
            ) : (
              <div className="text-center p-6">
                <QrCode className="w-16 h-16 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Ingresá una URL para ver tu QR
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
