import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImageDown, FileImage, FileCode, FileText, Loader2 } from "lucide-react";
import QRCodeLib from "qrcode";

interface DownloadQRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  destinationUrl: string;
  color?: string;
  fileName?: string;
}

const formats = [
  { id: "jpg", label: "JPG", icon: ImageDown, description: "Imagen comprimida" },
  { id: "png", label: "PNG", icon: FileImage, description: "Imagen con transparencia" },
  { id: "svg", label: "SVG", icon: FileCode, description: "Vectorial escalable" },
] as const;

type Format = (typeof formats)[number]["id"];

export function DownloadQRDialog({
  open,
  onOpenChange,
  destinationUrl,
  color = "#000000",
  fileName = "qr-code",
}: DownloadQRDialogProps) {
  const [downloading, setDownloading] = useState<Format | null>(null);

  const handleDownload = async (format: Format) => {
    if (!destinationUrl) return;
    setDownloading(format);

    try {
      if (format === "svg") {
        const svgString = await QRCodeLib.toString(destinationUrl, {
          type: "svg",
          color: { dark: color, light: "#ffffff" },
          margin: 2,
          width: 1024,
        });
        const blob = new Blob([svgString], { type: "image/svg+xml" });
        downloadBlob(blob, `${fileName}.svg`);
      } else {
        const canvas = document.createElement("canvas");
        await QRCodeLib.toCanvas(canvas, destinationUrl, {
          width: 1024,
          margin: 2,
          color: { dark: color, light: "#ffffff" },
        });

        const mimeType = format === "jpg" ? "image/jpeg" : "image/png";
        const quality = format === "jpg" ? 0.92 : undefined;

        // For JPG, draw white background first
        if (format === "jpg") {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            const tempCanvas = document.createElement("canvas");
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const tempCtx = tempCanvas.getContext("2d")!;
            tempCtx.fillStyle = "#ffffff";
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            tempCtx.drawImage(canvas, 0, 0);
            tempCanvas.toBlob(
              (blob) => {
                if (blob) downloadBlob(blob, `${fileName}.jpg`);
              },
              mimeType,
              quality,
            );
            return;
          }
        }

        canvas.toBlob(
          (blob) => {
            if (blob) downloadBlob(blob, `${fileName}.${format}`);
          },
          mimeType,
          quality,
        );
      }
    } catch {
      // silent
    } finally {
      setTimeout(() => setDownloading(null), 500);
    }
  };

  const downloadBlob = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    onOpenChange(false);
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
            >
              {downloading === format.id ? (
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              ) : (
                <format.icon className="w-5 h-5 text-primary" />
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
