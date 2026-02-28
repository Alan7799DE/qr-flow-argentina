import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QrCode, Link2, Wand2, ArrowRight, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useCreateQR, validateUtmParams } from "@/hooks/useQRCodes";
import { useValidateUrl } from "@/hooks/useValidateUrl";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { StyledQRCode, type QRDotStyle } from "@/components/dashboard/StyledQRCode";
import { DotStyleSelector } from "@/components/dashboard/DotStyleSelector";

const urlSchema = z.string().url("Ingresá una URL válida (ej: https://tusitio.com)");
const nameSchema = z.string().min(1, "El nombre es requerido").max(100, "Máximo 100 caracteres");

export default function CreateQR() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const createQR = useCreateQR();
  const { validate: checkUrlReachability, isValidating: isValidatingUrl } = useValidateUrl();

  const [name, setName] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [color, setColor] = useState("#000000");
  const [dotStyle, setDotStyle] = useState<QRDotStyle>("square");
  const [showUtm, setShowUtm] = useState(false);
  const [utmSource, setUtmSource] = useState("");
  const [utmMedium, setUtmMedium] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");

  // Load pending QR data from sessionStorage
  useEffect(() => {
    const pendingUrl = sessionStorage.getItem("pending_qr_url");
    if (pendingUrl) {
      setDestinationUrl(pendingUrl);
      try {
        const parsed = new URL(pendingUrl.startsWith("http") ? pendingUrl : `https://${pendingUrl}`);
        setName(`QR - ${parsed.hostname}`);
      } catch {
        setName("QR - Mi sitio");
      }
    }
    const pendingColor = sessionStorage.getItem("pending_qr_color");
    if (pendingColor) setColor(pendingColor);
    const ps = sessionStorage.getItem("pending_qr_utm_source");
    if (ps) { setUtmSource(ps); setShowUtm(true); }
    const pm = sessionStorage.getItem("pending_qr_utm_medium");
    if (pm) { setUtmMedium(pm); setShowUtm(true); }
    const pc = sessionStorage.getItem("pending_qr_utm_campaign");
    if (pc) { setUtmCampaign(pc); setShowUtm(true); }
    sessionStorage.removeItem("pending_qr_url");
    sessionStorage.removeItem("pending_qr_color");
    sessionStorage.removeItem("pending_qr_utm_source");
    sessionStorage.removeItem("pending_qr_utm_medium");
    sessionStorage.removeItem("pending_qr_utm_campaign");
  }, []);

  const [errors, setErrors] = useState<{ name?: string; url?: string; utm_source?: string; utm_medium?: string; utm_campaign?: string }>({});

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
    if (!nameResult.success) newErrors.name = nameResult.error.errors[0].message;

    const urlToValidate = destinationUrl.startsWith("http") ? destinationUrl : `https://${destinationUrl}`;
    const urlResult = urlSchema.safeParse(urlToValidate);
    if (!urlResult.success) newErrors.url = urlResult.error.errors[0].message;

    const utmValidation = validateUtmParams({
      utm_source: utmSource || undefined,
      utm_medium: utmMedium || undefined,
      utm_campaign: utmCampaign || undefined,
    });
    if (!utmValidation.valid) Object.assign(newErrors, utmValidation.errors);

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const finalUrl = destinationUrl.startsWith("http") ? destinationUrl : `https://${destinationUrl}`;

    const urlCheck = await checkUrlReachability(finalUrl);
    if (urlCheck && !urlCheck.reachable) {
      toast({
        variant: "destructive",
        title: "Advertencia: URL posiblemente inaccesible",
        description: urlCheck.status
          ? `La URL respondió con código ${urlCheck.status}. Verificá que sea correcta.`
          : urlCheck.error || "No se pudo verificar la URL de destino.",
      });
    }

    try {
      await createQR.mutateAsync({
        name,
        destination_url: finalUrl,
        color,
        dot_style: dotStyle,
        utm_source: utmSource || undefined,
        utm_medium: utmMedium || undefined,
        utm_campaign: utmCampaign || undefined,
      });
      navigate("/dashboard");
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Crear nuevo QR</h1>
        <p className="text-muted-foreground mt-1">Configurá tu QR dinámico con URL editable</p>
      </div>

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
              <p className="text-sm text-muted-foreground">Un nombre para identificar este QR en tu dashboard</p>
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
              <p className="text-sm text-muted-foreground">Podés cambiar esta URL en cualquier momento</p>
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
                aria-label="Código de color hexadecimal"
              />
            </div>
          </div>

          {/* Dot Style Selector */}
          <DotStyleSelector value={dotStyle} onChange={setDotStyle} />

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
                <Input id="utm_source" placeholder="google" value={utmSource} onChange={(e) => setUtmSource(e.target.value)} maxLength={255} className={errors.utm_source ? "border-destructive" : ""} />
                {errors.utm_source && <p className="text-sm text-destructive">{errors.utm_source}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="utm_medium">utm_medium</Label>
                <Input id="utm_medium" placeholder="qr" value={utmMedium} onChange={(e) => setUtmMedium(e.target.value)} maxLength={255} className={errors.utm_medium ? "border-destructive" : ""} />
                {errors.utm_medium && <p className="text-sm text-destructive">{errors.utm_medium}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="utm_campaign">utm_campaign</Label>
                <Input id="utm_campaign" placeholder="verano2024" value={utmCampaign} onChange={(e) => setUtmCampaign(e.target.value)} maxLength={255} className={errors.utm_campaign ? "border-destructive" : ""} />
                {errors.utm_campaign && <p className="text-sm text-destructive">{errors.utm_campaign}</p>}
              </div>
            </div>
          )}

          {/* Preview URL */}
          {destinationUrl && buildFinalUrl() && (
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-sm font-medium text-foreground mb-1">URL final:</p>
              <p className="text-sm text-muted-foreground break-all">{buildFinalUrl()}</p>
            </div>
          )}
        </div>

        {/* QR Preview */}
        <div className="bg-card rounded-xl border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Vista previa</h3>
          <div className="max-w-[200px] mx-auto flex items-center justify-center">
            {buildFinalUrl() ? (
              <StyledQRCode url={buildFinalUrl()} color={color} dotStyle={dotStyle} size={200} />
            ) : (
              <div className="aspect-square w-full bg-muted rounded-xl flex items-center justify-center">
                <QrCode className="w-16 h-16 text-muted-foreground/50" />
              </div>
            )}
          </div>
          {!buildFinalUrl() && (
            <p className="text-center text-sm text-muted-foreground mt-4">Ingresá una URL para ver la vista previa</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button type="submit" variant="hero" size="lg" className="flex-1" disabled={createQR.isPending || isValidatingUrl}>
            {isValidatingUrl ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Verificando URL...</>
            ) : createQR.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Creando...</>
            ) : (
              <>Crear QR<ArrowRight className="w-4 h-4" /></>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
