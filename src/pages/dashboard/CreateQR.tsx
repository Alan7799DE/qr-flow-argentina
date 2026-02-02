import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QrCode, Link2, Wand2, ArrowRight, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useCreateQR } from "@/hooks/useQRCodes";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import QRCodeLib from "qrcode";

const urlSchema = z.string().url("Ingresá una URL válida (ej: https://tusitio.com)");
const nameSchema = z.string().min(1, "El nombre es requerido").max(100, "Máximo 100 caracteres");

export default function CreateQR() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const createQR = useCreateQR();

  const [name, setName] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [color, setColor] = useState("#000000");
  const [showUtm, setShowUtm] = useState(false);
  const [utmSource, setUtmSource] = useState("");
  const [utmMedium, setUtmMedium] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [errors, setErrors] = useState<{ name?: string; url?: string }>({});
  const [qrPreview, setQrPreview] = useState<string>("");

  // Generate QR preview
  useEffect(() => {
    const generatePreview = async () => {
      if (!destinationUrl) {
        setQrPreview("");
        return;
      }

      try {
        const finalUrl = buildFinalUrl();
        if (!finalUrl) return;

        const dataUrl = await QRCodeLib.toDataURL(finalUrl, {
          width: 200,
          margin: 2,
          color: {
            dark: color,
            light: "#ffffff",
          },
        });
        setQrPreview(dataUrl);
      } catch {
        setQrPreview("");
      }
    };

    const timeout = setTimeout(generatePreview, 300);
    return () => clearTimeout(timeout);
  }, [destinationUrl, color, utmSource, utmMedium, utmCampaign]);

  const buildFinalUrl = () => {
    if (!destinationUrl) return "";
    
    try {
      const url = new URL(destinationUrl.startsWith("http") ? destinationUrl : `https://${destinationUrl}`);
      
      if (utmSource) url.searchParams.set("utm_source", utmSource);
      if (utmMedium) url.searchParams.set("utm_medium", utmMedium);
      if (utmCampaign) url.searchParams.set("utm_campaign", utmCampaign);
      
      return url.toString();
    } catch {
      return "";
    }
  };

  const validate = () => {
    const newErrors: typeof errors = {};

    const nameResult = nameSchema.safeParse(name);
    if (!nameResult.success) {
      newErrors.name = nameResult.error.errors[0].message;
    }

    const urlToValidate = destinationUrl.startsWith("http") ? destinationUrl : `https://${destinationUrl}`;
    const urlResult = urlSchema.safeParse(urlToValidate);
    if (!urlResult.success) {
      newErrors.url = urlResult.error.errors[0].message;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    const finalUrl = destinationUrl.startsWith("http") ? destinationUrl : `https://${destinationUrl}`;

    try {
      await createQR.mutateAsync({
        name,
        destination_url: finalUrl,
        color,
        utm_source: utmSource || undefined,
        utm_medium: utmMedium || undefined,
        utm_campaign: utmCampaign || undefined,
      });
      navigate("/dashboard");
    } catch {
      // Error is handled by the mutation
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Crear nuevo QR</h1>
        <p className="text-muted-foreground mt-1">
          Configurá tu QR dinámico con URL editable
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleCreate} className="space-y-6">
        <div className="bg-card rounded-xl border p-6 space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del QR</Label>
            <Input
              id="name"
              placeholder="Ej: Campaña de verano 2024"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name ? (
              <p className="text-sm text-destructive">{errors.name}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Un nombre para identificar este QR en tu dashboard
              </p>
            )}
          </div>

          {/* Destination URL */}
          <div className="space-y-2">
            <Label htmlFor="url">URL de destino</Label>
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="url"
                type="text"
                placeholder="https://tu-sitio.com/landing"
                value={destinationUrl}
                onChange={(e) => setDestinationUrl(e.target.value)}
                className={`pl-10 ${errors.url ? "border-destructive" : ""}`}
              />
            </div>
            {errors.url ? (
              <p className="text-sm text-destructive">{errors.url}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Podés cambiar esta URL en cualquier momento
              </p>
            )}
          </div>

          {/* Color picker */}
          <div className="space-y-2">
            <Label htmlFor="color">Color del QR</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                id="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-10 rounded-lg border cursor-pointer"
              />
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-32"
                placeholder="#000000"
              />
            </div>
          </div>

          {/* UTM Builder Toggle */}
          <button
            type="button"
            onClick={() => setShowUtm(!showUtm)}
            className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <Wand2 className="w-4 h-4" />
            UTM Builder
            {showUtm ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {/* UTM Fields */}
          {showUtm && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t">
              <div className="space-y-2">
                <Label htmlFor="utm_source">utm_source</Label>
                <Input
                  id="utm_source"
                  placeholder="google"
                  value={utmSource}
                  onChange={(e) => setUtmSource(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="utm_medium">utm_medium</Label>
                <Input
                  id="utm_medium"
                  placeholder="qr"
                  value={utmMedium}
                  onChange={(e) => setUtmMedium(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="utm_campaign">utm_campaign</Label>
                <Input
                  id="utm_campaign"
                  placeholder="verano2024"
                  value={utmCampaign}
                  onChange={(e) => setUtmCampaign(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Preview URL */}
          {destinationUrl && buildFinalUrl() && (
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-sm font-medium text-foreground mb-1">URL final:</p>
              <p className="text-sm text-muted-foreground break-all">
                {buildFinalUrl()}
              </p>
            </div>
          )}
        </div>

        {/* QR Preview */}
        <div className="bg-card rounded-xl border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Vista previa</h3>
          <div className="aspect-square max-w-[200px] mx-auto bg-muted rounded-xl flex items-center justify-center overflow-hidden">
            {qrPreview ? (
              <img src={qrPreview} alt="QR Preview" className="w-full h-full object-contain" />
            ) : (
              <QrCode className="w-16 h-16 text-muted-foreground/50" />
            )}
          </div>
          {!qrPreview && (
            <p className="text-center text-sm text-muted-foreground mt-4">
              Ingresá una URL para ver la vista previa
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            type="submit"
            variant="hero"
            size="lg"
            className="flex-1"
            disabled={createQR.isPending}
          >
            {createQR.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creando...
              </>
            ) : (
              <>
                Crear QR
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
