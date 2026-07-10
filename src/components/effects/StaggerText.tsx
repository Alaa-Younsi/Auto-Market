import { Fragment } from "react";
import { motion } from "framer-motion";
import { useMediaFlags } from "@/hooks/useMediaFlags";
import { cn } from "@/lib/utils";

interface StaggerTextProps {
  text: string;
  className?: string;
  wordClassName?: string;
  baseDelay?: number;
  step?: number;
}

/**
 * Rises text in word by word. Splits on spaces only (never mid-word), so
 * Arabic letter-joining/ligatures stay intact — safe for both languages.
 */
export function StaggerText({
  text,
  className,
  wordClassName,
  baseDelay = 0,
  step = 0.06,
}: StaggerTextProps) {
  const { prefersReducedMotion } = useMediaFlags();
  const words = text.split(" ");

  if (prefersReducedMotion) {
    return <span className={cn(className, wordClassName)}>{text}</span>;
  }

  return (
    <span className={className}>
      {words.map((word, i) => (
        // A plain (non-block) fragment: the trailing space must live outside
        // the inline-block clip wrapper below, or the browser trims it as
        // end-of-box whitespace and every word runs into the next.
        <Fragment key={i}>
          <span className="inline-block overflow-hidden align-bottom">
            <motion.span
              className={cn("inline-block", wordClassName)}
              initial={{ y: "0.7em", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                duration: 0.5,
                ease: [0.16, 1, 0.3, 1],
                delay: baseDelay + i * step,
              }}
            >
              {word}
            </motion.span>
          </span>
          {i < words.length - 1 && " "}
        </Fragment>
      ))}
    </span>
  );
}
