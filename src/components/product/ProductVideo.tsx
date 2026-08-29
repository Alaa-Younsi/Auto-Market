import { useEffect, useRef, useState } from "react";
import { responsiveSrcSet } from "@/lib/image";

interface ProductVideoProps {
  src: string;
  poster?: string;
  className?: string;
}

/**
 * Autoplaying showcase reel: muted (required for unprompted autoplay),
 * looping, and controls-free so the shopper can't pause or scrub it.
 *
 * The <video> tag isn't mounted until the container scrolls near the viewport
 * (it's the heaviest asset on the page), and `preload="none"` keeps bytes from
 * moving until an actual play. Product.tsx also mounts only ONE of the
 * desktop/mobile pair, so the clip is never fetched twice per view.
 */
export function ProductVideo({ src, poster, className }: ProductVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={className}>
      {shouldLoad ? (
        <video
          src={src}
          poster={poster}
          autoPlay
          loop
          muted
          playsInline
          disablePictureInPicture
          disableRemotePlayback
          preload="none"
          onContextMenu={(e) => e.preventDefault()}
          className="w-full rounded-2xl border border-line bg-panel-2"
        />
      ) : (
        poster && (
          <img
            src={poster}
            srcSet={responsiveSrcSet(poster)}
            sizes="(max-width: 1024px) 100vw, 512px"
            alt=""
            loading="lazy"
            decoding="async"
            className="w-full rounded-2xl border border-line bg-panel-2 object-cover"
          />
        )
      )}
    </div>
  );
}
