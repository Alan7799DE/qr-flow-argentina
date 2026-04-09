/**
 * Validates and normalizes a destination URL for QR codes.
 * - Trims whitespace
 * - Auto-completes https:// if no protocol
 * - Validates with native URL constructor
 * - Only allows http: and https:
 * 
 * Returns { valid: true, url: normalizedUrl } or { valid: false, error: string }
 */
export function validateDestinationUrl(input: string): {
  valid: boolean;
  url?: string;
  error?: string;
} {
  const trimmed = input.trim();

  if (!trimmed) {
    return { valid: false, error: "La URL es requerida" };
  }

  // Auto-complete protocol
  const raw = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(raw);
    const protocol = parsed.protocol.toLowerCase();

    if (protocol !== "http:" && protocol !== "https:") {
      return {
        valid: false,
        error: "La URL ingresada no es válida. Ejemplo: https://misitioweb.com",
      };
    }

    // Prevent self-referencing QR URLs (causes infinite redirect loops)
    const hostname = parsed.hostname.toLowerCase();
    if (
      (hostname === "qrapido.io" || hostname === "www.qrapido.io" || hostname === "qrapido.lovable.app") &&
      parsed.pathname.startsWith("/r/")
    ) {
      return {
        valid: false,
        error: "No podés usar una URL de redirección de QRapido como destino. Ingresá la URL final (ej: https://drive.google.com/...).",
      };
    }

    return { valid: true, url: parsed.toString() };
  } catch {
    return {
      valid: false,
      error: "La URL ingresada no es válida. Ejemplo: https://misitioweb.com",
    };
  }
}
