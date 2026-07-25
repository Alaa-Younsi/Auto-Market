import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";
import { useMediaFlags } from "@/hooks/useMediaFlags";
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

/**
 * Domain-agnostic product gallery: owns no state of its own, so a color
 * swatch, a thumbnail click, and a swipe all drive the same index from the
 * parent. Main image crossfades; a horizontal drag on it also advances/goes
 * back, snapping back rather than translating — the crossfade is the
 * transition.
 */
export function Gallery({ images, activeIndex, onActiveChange, name }: GalleryProps) {
  const { dir } = useLanguage();
  const { prefersReducedMotion } = useMediaFlags();
  const image = images[activeIndex];

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
      <TiltCard className="relative aspect-square overflow-hidden rounded-2xl border border-line bg-panel-2">
        <AnimatePresence mode="wait" initial={false}>
          {image ? (
            <motion.img
              key={image.key}
              src={image.url}
              alt={image.alt || name}
              width={800}
              height={800}
              /* The LCP element on this page — never lazy, and asked for
                 ahead of the rest of the page's requests. */
              loading="eager"
              fetchPriority="high"
              decoding="async"
              draggable={false}
              drag={images.length > 1 ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.25}
              onDragEnd={handleDragEnd}
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
              <img
                src={img.url}
                alt=""
                width={64}
                height={64}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
