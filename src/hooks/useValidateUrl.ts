import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UrlValidationResult {
  reachable: boolean;
  status?: number;
  error?: string;
}

export function useValidateUrl() {
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState<UrlValidationResult | null>(null);

  const validate = async (url: string): Promise<UrlValidationResult | null> => {
    if (!url) return null;

    const finalUrl = url.startsWith("http") ? url : `https://${url}`;

    setIsValidating(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("validate-url", {
        body: { url: finalUrl },
      });

      if (error) {
        console.error("URL validation error:", error);
        // Fail-open: don't block on validation errors
        return null;
      }

      setResult(data);
      return data as UrlValidationResult;
    } catch {
      // Fail-open
      return null;
    } finally {
      setIsValidating(false);
    }
  };

  const clear = () => setResult(null);

  return { validate, isValidating, result, clear };
}
