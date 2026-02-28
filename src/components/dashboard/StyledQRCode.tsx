import { useEffect, useRef } from "react";
import QRCodeStyling, { type DotType } from "qr-code-styling";

export type QRDotStyle = "square" | "dots" | "rounded" | "classy" | "classy-rounded" | "extra-rounded";

// Map dot style to corner styles for visual consistency
const cornerStyleMap: Record<QRDotStyle, { cornersSquare: string; cornersDot: string }> = {
  square: { cornersSquare: "square", cornersDot: "square" },
  dots: { cornersSquare: "dot", cornersDot: "dot" },
  rounded: { cornersSquare: "extra-rounded", cornersDot: "dot" },
  classy: { cornersSquare: "extra-rounded", cornersDot: "dot" },
  "classy-rounded": { cornersSquare: "extra-rounded", cornersDot: "dot" },
  "extra-rounded": { cornersSquare: "extra-rounded", cornersDot: "dot" },
};

interface StyledQRCodeProps {
  url: string;
  color?: string;
  dotStyle?: QRDotStyle;
  size?: number;
  className?: string;
}

export function StyledQRCode({ url, color = "#000000", dotStyle = "square", size = 200, className }: StyledQRCodeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const qrRef = useRef<QRCodeStyling | null>(null);

  useEffect(() => {
    const corners = cornerStyleMap[dotStyle] || cornerStyleMap.square;
    
    const qrCode = new QRCodeStyling({
      width: size,
      height: size,
      data: url || "https://example.com",
      type: "svg",
      margin: 8,
      dotsOptions: {
        type: dotStyle as DotType,
        color,
      },
      cornersSquareOptions: {
        type: corners.cornersSquare as any,
        color,
      },
      cornersDotOptions: {
        type: corners.cornersDot as any,
        color,
      },
      backgroundOptions: {
        color: "#ffffff",
      },
      qrOptions: {
        errorCorrectionLevel: "M",
      },
    });

    qrRef.current = qrCode;

    if (ref.current) {
      ref.current.innerHTML = "";
      qrCode.append(ref.current);
    }

    return () => {
      if (ref.current) {
        ref.current.innerHTML = "";
      }
    };
  }, [url, color, dotStyle, size]);

  return <div ref={ref} className={className} />;
}

// Utility: download QR in specific format
export async function downloadStyledQR({
  url,
  color = "#000000",
  dotStyle = "square",
  format,
  fileName = "qr-code",
}: {
  url: string;
  color?: string;
  dotStyle?: QRDotStyle;
  format: "png" | "svg" | "jpeg";
  fileName?: string;
}) {
  const corners = cornerStyleMap[dotStyle] || cornerStyleMap.square;

  const qrCode = new QRCodeStyling({
    width: 1024,
    height: 1024,
    data: url,
    type: "svg",
    margin: 32,
    dotsOptions: {
      type: dotStyle as DotType,
      color,
    },
    cornersSquareOptions: {
      type: corners.cornersSquare as any,
      color,
    },
    cornersDotOptions: {
      type: corners.cornersDot as any,
      color,
    },
    backgroundOptions: {
      color: "#ffffff",
    },
    qrOptions: {
      errorCorrectionLevel: "M",
    },
  });

  const extension = format === "jpeg" ? "jpg" : format;
  await qrCode.download({ name: fileName, extension: extension as any });
}
