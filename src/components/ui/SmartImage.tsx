import { type ImgHTMLAttributes, useState } from "react";
import { responsiveSrcSet } from "@/lib/image";
import { cn } from "@/lib/utils";

interface SmartImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  /** Match the real rendered size, or the srcset picks the largest candidate
      regardless of layout and defeats the point (e.g. "44px", "(max-width: 640px) 50vw, 240px"). */
  sizes?: string;
}

/**
 * Drop-in <img> that serves a Supabase render-endpoint srcset, lazy-loads and
 * fades in, and self-heals: if a srcset candidate 404s (render endpoint
 * disabled for the project), it drops the srcset once and re-renders against
 * the raw object URL — which is always valid — instead of going blank.
 * Browsers do NOT fall back to `src` on a failed srcset candidate on their own.
 */
export function SmartImage({
  src,
  sizes,
  className,
  alt = "",
  onLoad,
  onError,
  ...rest
}: SmartImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [useSrcSet, setUseSrcSet] = useState(true);

  const srcSet = useSrcSet ? responsiveSrcSet(src) : undefined;

  return (
    <img
      src={src}
      srcSet={srcSet}
      sizes={srcSet ? (sizes ?? "100vw") : undefined}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={cn(
        "transition-opacity duration-500",
        loaded ? "opacity-100" : "opacity-0",
        className
      )}
      onLoad={(e) => {
        setLoaded(true);
        onLoad?.(e);
      }}
      onError={(e) => {
        if (useSrcSet && responsiveSrcSet(src)) {
          setUseSrcSet(false);
          return;
        }
        setLoaded(true); // clear the fade so a truly broken image isn't an invisible hole
        onError?.(e);
      }}
      {...rest}
    />
  );
}
