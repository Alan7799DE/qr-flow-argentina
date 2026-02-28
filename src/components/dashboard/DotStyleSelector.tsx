import { Label } from "@/components/ui/label";
import type { QRDotStyle } from "./StyledQRCode";

const DOT_STYLES: { value: QRDotStyle; label: string; preview: string }[] = [
  { value: "square", label: "Cuadrado", preview: "■■■" },
  { value: "dots", label: "Puntos", preview: "●●●" },
  { value: "rounded", label: "Redondeado", preview: "◉◉◉" },
  { value: "classy", label: "Clásico", preview: "◆◆◆" },
  { value: "classy-rounded", label: "Clásico R.", preview: "◈◈◈" },
  { value: "extra-rounded", label: "Extra R.", preview: "⬤⬤⬤" },
];

interface DotStyleSelectorProps {
  value: QRDotStyle;
  onChange: (value: QRDotStyle) => void;
}

export function DotStyleSelector({ value, onChange }: DotStyleSelectorProps) {
  return (
    <div className="space-y-2">
      <Label>Forma de los puntos</Label>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {DOT_STYLES.map((style) => (
          <button
            key={style.value}
            type="button"
            onClick={() => onChange(style.value)}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all text-center ${
              value === style.value
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border hover:border-primary/30 hover:bg-muted/50"
            }`}
          >
            <span className="text-lg leading-none tracking-tighter">{style.preview}</span>
            <span className="text-[10px] font-medium text-muted-foreground leading-none">{style.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
