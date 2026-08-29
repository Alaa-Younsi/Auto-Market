import { type SyntheticEvent, useState } from "react";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";
import { useMediaFlags } from "@/hooks/useMediaFlags";
import { responsiveSrcSet } from "@/lib/image";
import { SmartImage } from "@/components/ui/SmartImage";
import { TiltCard } from "@/components/ui/TiltCard";
import { cn } from "@/lib/utils";

export interface GalleryImage {
  key: string;
  url: string;
  alt?: string;
}

interface GalleryProps {
  images: GalleryImage[];
  activeIndex: number;
  onActiveChange: (index: number) => void;
  name: string;
}

const SWIPE_THRESHOLD = 60;
// Keep the frame within a sane band so a panorama or a very tall photo can't
// blow out the page layout.
const MIN_RATIO = 0.62;
const MAX_RATIO = 1.5;

/**
 * Domain-agnostic product gallery: owns no state of its own, so a color
 * swatch, a thumbnail click, and a swipe all drive the same index from the
 * parent. Main image crossfades; a horizontal drag on it also advances/goes
 * back, snapping back rather than translating — the crossfade is the
 * transition. The frame's aspect ratio follows the FIRST image's natural
 * width:height (clamped) so portrait/landscape photos aren't force-cropped
 * into a square; later images still `object-cover` into that frame.
 */
export function Gallery({ images, activeIndex, onActiveChange, name }: GalleryProps) {
  const { dir } = useLanguage();
  const { prefersReducedMotion } = useMediaFlags();
  const image = images[activeIndex];

  // Frame ratio is learned from the first image the moment it loads (no extra
  // request — read off the rendered <img>). Null until then → square.
  const [frameRatio, setFrameRatio] = useState<number | null>(null);
  function handleMainLoad(e: SyntheticEvent<HTMLImageElement>) {
    if (activeIndex !== 0) return;
    const el = e.currentTarget;
    if (!el.naturalWidth || !el.naturalHeight) return;
    const raw = el.naturalWidth / el.naturalHeight;
    setFrameRatio(Math.min(MAX_RATIO, Math.max(MIN_RATIO, raw)));
  }

  function goTo(index: number) {
    const count = images.length;
    onActiveChange(((index % count) + count) % count);
  }

  function handleDragEnd(_event: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) {
    // A physical left-swipe always means "next", regardless of reading direction.
    const offset = dir === "rtl" ? -info.offset.x : info.offset.x;
    if (offset <= -SWIPE_THRESHOLD) goTo(activeIndex + 1);
    else if (offset >= SWIPE_THRESHOLD) goTo(activeIndex - 1);
  }

  return (
    <div>
      <TiltCard
        style={frameRatio ? { aspectRatio: frameRatio } : undefined}
        className={cn(
          "relative overflow-hidden rounded-2xl border border-line bg-panel-2",
          !frameRatio && "aspect-square"
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {image ? (
            <motion.img
              key={image.key}
              src={image.url}
              srcSet={responsiveSrcSet(image.url)}
              sizes="(max-width: 1024px) 100vw, 512px"
              alt={image.alt || name}
              width={800}
              height={800}
              /* The LCP element on this page — never lazy, and asked for
                 ahead of the rest of the page's requests. This one keeps its
                 own <img> (it drives the crossfade + drag itself, so it can't
                 share SmartImage's fade state) but still gets the srcset. */
              loading="eager"
              fetchPriority="high"
              decoding="async"
              draggable={false}
              drag={images.length > 1 ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.25}
              onDragEnd={handleDragEnd}
              onLoad={handleMainLoad}
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{ touchAction: "pan-y" }}
              className="absolute inset-0 h-full w-full select-none object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted">
              <ShoppingBag size={48} />
            </div>
          )}
        </AnimatePresence>
      </TiltCard>

      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={img.key}
              onClick={() => onActiveChange(i)}
              className={cn(
                "h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors",
                i === activeIndex ? "border-brand" : "border-line"
              )}
            >
              <SmartImage
                src={img.url}
                alt=""
                width={64}
                height={64}
                sizes="64px"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
