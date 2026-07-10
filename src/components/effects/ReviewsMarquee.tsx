import { useLanguage } from "@/i18n/LanguageProvider";
import { useMediaFlags } from "@/hooks/useMediaFlags";
import { BentoPanel } from "@/components/ui/BentoPanel";
import { StarRating } from "@/components/ui/StarRating";
import type { ClientReview } from "@/types/db";

interface ReviewsMarqueeProps {
  reviews: ClientReview[];
}

function ReviewCard({ review }: { review: ClientReview }) {
  const { dir } = useLanguage();
  return (
    <BentoPanel
      glow
      dir={dir}
      className="fx-lift h-full w-[300px] shrink-0 p-6 sm:w-[340px]"
    >
      <StarRating value={review.stars} animated />
      <p className="mt-3 text-sm leading-relaxed text-ink">"{review.review_text}"</p>
      <div className="mt-4 flex items-center gap-2">
        {review.image_url ? (
          <img src={review.image_url} alt="" className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand">
            {review.client_name.charAt(0)}
          </div>
        )}
        <p className="text-sm font-semibold text-ink">{review.client_name}</p>
      </div>
    </BentoPanel>
  );
}

/**
 * A self-scrolling strip of reviews. The track is rendered twice back to
 * back and animated exactly -50% so the loop is seamless; on reduced motion
 * that would just be an invisible duplicate, so we fall back to a static grid.
 */
export function ReviewsMarquee({ reviews }: ReviewsMarqueeProps) {
  const { prefersReducedMotion } = useMediaFlags();

  if (reviews.length === 0) return null;

  if (prefersReducedMotion) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {reviews.slice(0, 6).map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>
    );
  }

  const duration = Math.max(24, reviews.length * 6);

  return (
    // Locked to ltr: an rtl overflow container anchors overflowing content
    // flush to its *right* edge (mirrors how RTL scrolling works), which
    // combined with the translateX keyframes would push the whole track
    // out of the visible mask. Each card re-asserts its own dir so text
    // still reads correctly.
    <div dir="ltr" className="fx-marquee-mask overflow-hidden">
      <div
        className="flex w-max animate-marquee gap-5 will-change-transform hover:[animation-play-state:paused] rtl:[animation-direction:reverse]"
        style={{ animationDuration: `${duration}s` }}
      >
        <div className="flex shrink-0 gap-5">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
        <div className="flex shrink-0 gap-5" aria-hidden="true">
          {reviews.map((review) => (
            <ReviewCard key={`dup-${review.id}`} review={review} />
          ))}
        </div>
      </div>
    </div>
  );
}
