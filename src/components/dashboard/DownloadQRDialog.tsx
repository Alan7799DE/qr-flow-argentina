import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImageDown, FileImage, FileCode, Loader2 } from "lucide-react";
import { downloadStyledQR, type QRDotStyle } from "./StyledQRCode";

interface DownloadQRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  destinationUrl: string;
  color?: string;
  dotStyle?: QRDotStyle;
  fileName?: string;
}

const formats = [
  { id: "jpeg", label: "JPG", icon: ImageDown, description: "Imagen comprimida" },
  { id: "png", label: "PNG", icon: FileImage, description: "Imagen con transparencia" },
  { id: "svg", label: "SVG", icon: FileCode, description: "Vectorial escalable" },
] as const;

type Format = (typeof formats)[number]["id"];

export function DownloadQRDialog({
  open,
  onOpenChange,
  destinationUrl,
  color = "#000000",
  dotStyle = "square",
  fileName = "qr-code",
}: DownloadQRDialogProps) {
  const [downloading, setDownloading] = useState<Format | null>(null);

  const handleDownload = async (format: Format) => {
    if (!destinationUrl) return;
    setDownloading(format);

    try {
      await downloadStyledQR({
        url: destinationUrl,
        color,
        dotStyle,
        format: format as "png" | "svg" | "jpeg",
        fileName,
      });
      onOpenChange(false);
    } catch {
      // silent
    } finally {
      setTimeout(() => setDownloading(null), 500);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Descargar Código QR</DialogTitle>
        </DialogHeader>
        <div className="border rounded-xl divide-y">
          {formats.map((format) => (
            <button
              key={format.id}
              onClick={() => handleDownload(format.id)}
              disabled={downloading !== null}
              className="flex items-center gap-4 w-full px-5 py-4 hover:bg-muted/50 transition-colors text-left disabled:opacity-50"
              data-gtm={`btn-download-${format.id}`}
            >
              {downloading === format.id ? (
                <Loader2 className="w-5 h-5 text-primary animate-spin pointer-events-none" />
              ) : (
                <format.icon className="w-5 h-5 text-primary pointer-events-none" />
              )}
              <div>
                <span className="font-medium text-foreground">{format.label}</span>
                <p className="text-xs text-muted-foreground">{format.description}</p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
