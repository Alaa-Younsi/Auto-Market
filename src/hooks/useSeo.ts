import { useEffect } from "react";

interface SeoOptions {
  title: string;
  description?: string;
  image?: string;
}

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export function useSeo({ title, description, image }: SeoOptions) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    if (description) {
      upsertMeta("name", "description", description);
      upsertMeta("property", "og:description", description);
      upsertMeta("name", "twitter:description", description);
    }
    upsertMeta("property", "og:title", title);
    upsertMeta("name", "twitter:title", title);
    if (image) {
      upsertMeta("property", "og:image", image);
      upsertMeta("name", "twitter:image", image);
    }

    return () => {
      document.title = previousTitle;
    };
  }, [title, description, image]);
}
