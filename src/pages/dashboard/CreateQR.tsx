import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QrCode, Link2, Wand2, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function CreateQR() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [showUtm, setShowUtm] = useState(false);
  const [utmSource, setUtmSource] = useState("");
  const [utmMedium, setUtmMedium] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !destinationUrl) {
      toast({
        variant: "destructive",
        title: "Campos requeridos",
        description: "Completá el nombre y la URL de destino.",
      });
      return;
    }

    setIsLoading(true);

    // TODO: Implement actual QR creation
    setTimeout(() => {
      toast({
        title: "¡QR creado!",
        description: "Tu código QR fue creado exitosamente.",
      });
      setIsLoading(false);
    }, 1500);
  };

  const buildFinalUrl = () => {
    if (!destinationUrl) return "";
    
    const url = new URL(destinationUrl.startsWith("http") ? destinationUrl : `https://${destinationUrl}`);
    
    if (utmSource) url.searchParams.set("utm_source", utmSource);
    if (utmMedium) url.searchParams.set("utm_medium", utmMedium);
    if (utmCampaign) url.searchParams.set("utm_campaign", utmCampaign);
    
    return url.toString();
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
            />
            <p className="text-sm text-muted-foreground">
              Un nombre para identificar este QR en tu dashboard
            </p>
          </div>

          {/* Destination URL */}
          <div className="space-y-2">
            <Label htmlFor="url">URL de destino</Label>
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="url"
                type="url"
                placeholder="https://tu-sitio.com/landing"
                value={destinationUrl}
                onChange={(e) => setDestinationUrl(e.target.value)}
                className="pl-10"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Podés cambiar esta URL en cualquier momento
            </p>
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
          {destinationUrl && (
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-sm font-medium text-foreground mb-1">URL final:</p>
              <p className="text-sm text-muted-foreground break-all">
                {buildFinalUrl()}
              </p>
            </div>
          )}
        </div>

        {/* QR Preview placeholder */}
        <div className="bg-card rounded-xl border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Vista previa</h3>
          <div className="aspect-square max-w-[200px] mx-auto bg-muted rounded-xl flex items-center justify-center">
            <QrCode className="w-16 h-16 text-muted-foreground/50" />
          </div>
          <p className="text-center text-sm text-muted-foreground mt-4">
            El QR se generará al guardar
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            type="submit"
            variant="hero"
            size="lg"
            className="flex-1"
            disabled={isLoading}
          >
            {isLoading ? "Creando..." : "Crear QR"}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
