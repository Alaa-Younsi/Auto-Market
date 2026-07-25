import { useEffect } from "react";

interface SeoOptions {
  title: string;
  description?: string;
  image?: string;
  /** schema.org payload for this page, injected as ld+json. */
  jsonLd?: Record<string, unknown>;
}

const SITE_URL = "https://www.auto-market.shop";
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertCanonical(href: string) {
  let el = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.rel = "canonical";
    document.head.appendChild(el);
  }
  el.href = href;
}

/**
 * Per-page metadata. Note this runs in the browser: Google executes JS and will
 * see it, but link-preview scrapers (Facebook, WhatsApp, Twitter) do not — for
 * those, `middleware.ts` serves pre-rendered tags on /product/* at the edge.
 */
export function useSeo({ title, description, image, jsonLd }: SeoOptions) {
  // Depend on the serialized form: callers build the object inline, so its
  // identity changes every render and would re-run the effect each time.
  const jsonLdText = jsonLd ? JSON.stringify(jsonLd) : null;

  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    const url = `${SITE_URL}${window.location.pathname}`;

    if (description) {
      upsertMeta("name", "description", description);
      upsertMeta("property", "og:description", description);
      upsertMeta("name", "twitter:description", description);
    }
    upsertMeta("property", "og:title", title);
    upsertMeta("name", "twitter:title", title);
    upsertMeta("property", "og:url", url);
    upsertMeta("property", "og:image", image ?? DEFAULT_IMAGE);
    upsertMeta("name", "twitter:image", image ?? DEFAULT_IMAGE);
    upsertCanonical(url);

    // Page-scoped structured data, torn down on unmount so a product's schema
    // never lingers on the next route.
    let script: HTMLScriptElement | null = null;
    if (jsonLdText) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.dataset.seo = "page";
      script.textContent = jsonLdText;
      document.head.appendChild(script);
    }

    return () => {
      document.title = previousTitle;
      script?.remove();
    };
  }, [title, description, image, jsonLdText]);
}
