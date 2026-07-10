import { Star } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useMediaFlags } from "@/hooks/useMediaFlags";

interface StarRatingProps {
  value: number;
  size?: number;
  /** Spring the stars in one-by-one when they enter view, instead of a static row. */
  animated?: boolean;
}

export function StarRating({ value, size = 16, animated = false }: StarRatingProps) {
  const { prefersReducedMotion } = useMediaFlags();
  const playAnimated = animated && !prefersReducedMotion;

  return (
    <div className="flex items-center gap-0.5" aria-label={`${value} / 5`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const star = (
          <Star
            size={size}
            className={cn(i < value ? "fill-brand text-brand" : "fill-transparent text-line")}
          />
        );
        if (!playAnimated) return <span key={i}>{star}</span>;
        return (
          <motion.span
            key={i}
            className="inline-flex"
            initial={{ scale: 0.4, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 320, damping: 16, delay: i * 0.07 }}
          >
            {star}
          </motion.span>
        );
      })}
    </div>
  );
}
