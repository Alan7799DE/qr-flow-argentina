import { useEffect } from "react";

interface SEOHeadProps {
  title: string;
  description: string;
  canonical?: string;
  ogType?: string;
  noindex?: boolean;
}

const BASE_URL = "https://creatuqr.lovable.app";
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.png`;
const SITE_NAME = "QRapido";

export function SEOHead({
  title,
  description,
  canonical,
  ogType = "website",
  noindex = false,
}: SEOHeadProps) {
  const fullTitle = title === SITE_NAME ? title : `${title} | ${SITE_NAME}`;
  const canonicalUrl = canonical ? `${BASE_URL}${canonical}` : undefined;

  useEffect(() => {
    // Title
    document.title = fullTitle;

    // Meta description
    setMeta("description", description);

    // Robots
    if (noindex) {
      setMeta("robots", "noindex, nofollow");
    } else {
      removeMeta("robots");
    }

    // Open Graph
    setMetaProperty("og:title", fullTitle);
    setMetaProperty("og:description", description);
    setMetaProperty("og:type", ogType);
    setMetaProperty("og:image", DEFAULT_OG_IMAGE);
    setMetaProperty("og:site_name", SITE_NAME);
    if (canonicalUrl) {
      setMetaProperty("og:url", canonicalUrl);
    }

    // Twitter Cards
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", fullTitle);
    setMeta("twitter:description", description);
    setMeta("twitter:image", DEFAULT_OG_IMAGE);

    // Canonical
    updateCanonical(canonicalUrl);

    return () => {
      // Cleanup canonical on unmount
      const existing = document.querySelector('link[rel="canonical"]');
      if (existing) existing.remove();
    };
  }, [fullTitle, description, canonicalUrl, ogType, noindex]);

  return null;
}

function setMeta(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.name = name;
    document.head.appendChild(el);
  }
  el.content = content;
}

function removeMeta(name: string) {
  const el = document.querySelector(`meta[name="${name}"]`);
  if (el) el.remove();
}

function setMetaProperty(property: string, content: string) {
  let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.content = content;
}

function updateCanonical(url?: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (url) {
    if (!el) {
      el = document.createElement("link");
      el.rel = "canonical";
      document.head.appendChild(el);
    }
    el.href = url;
  } else if (el) {
    el.remove();
  }
}
