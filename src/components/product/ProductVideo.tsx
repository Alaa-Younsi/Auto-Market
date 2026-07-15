import { useEffect, useRef, useState } from "react";

interface ProductVideoProps {
  src: string;
  poster?: string;
  className?: string;
}

/**
 * Autoplaying showcase reel: muted (required for unprompted autoplay),
 * looping, and controls-free so the shopper can't pause or scrub it.
 *
 * The <video> tag itself isn't mounted until the container scrolls near the
 * viewport — it's the heaviest asset on the page, and both the desktop and
 * mobile breakpoints of this block exist in the DOM at once, so downloading
 * eagerly would fetch it twice as often as it's actually watched.
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
          preload="auto"
          onContextMenu={(e) => e.preventDefault()}
          className="w-full rounded-2xl border border-line bg-panel-2"
        />
      ) : (
        poster && (
          <img
            src={poster}
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
