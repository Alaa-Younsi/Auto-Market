import { motion } from "framer-motion";
import { useMediaFlags } from "@/hooks/useMediaFlags";

export function HeroArt() {
  const { enableHeavyEffects } = useMediaFlags();

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      {/* Ambient glow */}
      <div className="absolute h-[85%] w-[85%] rounded-full bg-brand/25 blur-[80px]" />
      <div className="absolute end-4 top-6 h-40 w-40 rounded-full bg-accent/20 blur-[60px]" />

      {/* Dashed rotating ring */}
      {enableHeavyEffects && (
        <div className="absolute h-[92%] w-[92%] animate-spin-slow rounded-full border-2 border-dashed border-brand/25" />
      )}
      <div className="absolute h-[70%] w-[70%] rounded-full border border-line" />

      {/* Dot grid backdrop */}
      <svg className="absolute h-full w-full opacity-40" viewBox="0 0 400 400" aria-hidden="true">
        <defs>
          <pattern id="dotgrid" width="18" height="18" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="1.5" fill="rgb(var(--c-brand) / 0.25)" />
          </pattern>
        </defs>
        <rect width="400" height="400" fill="url(#dotgrid)" />
      </svg>

      {/* Car illustration */}
      <motion.div
        className="relative z-10 w-[85%]"
        animate={enableHeavyEffects ? { y: [0, -14, 0] } : undefined}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg
          viewBox="0 0 640 300"
          className="w-full drop-shadow-[0_30px_40px_rgba(33,96,235,0.35)]"
        >
          <defs>
            <linearGradient id="carBody" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgb(var(--c-brand-light))" />
              <stop offset="55%" stopColor="rgb(var(--c-brand))" />
              <stop offset="100%" stopColor="rgb(var(--c-brand-dark))" />
            </linearGradient>
            <linearGradient id="carGlass" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--c-panel))" stopOpacity="0.9" />
              <stop offset="100%" stopColor="rgb(var(--c-panel-2))" stopOpacity="0.6" />
            </linearGradient>
          </defs>

          {/* ground shadow */}
          <ellipse cx="320" cy="262" rx="230" ry="18" fill="rgb(var(--c-ink) / 0.12)" />

          {/* body */}
          <path
            d="M40 200
               C55 150 110 118 175 112
               L230 76
               C260 58 300 50 345 52
               L430 58
               C470 60 505 78 528 108
               L560 150
               C592 154 612 168 612 190
               C612 206 598 214 578 216
               L560 216
               C556 232 538 244 518 244
               C498 244 480 232 476 216
               L214 216
               C210 232 192 244 172 244
               C152 244 134 232 130 216
               L74 216
               C52 214 40 208 40 200 Z"
            fill="url(#carBody)"
            stroke="rgb(var(--c-brand-dark))"
            strokeWidth="2"
          />

          {/* windows */}
          <path d="M240 82 L228 112 L340 112 L336 66 Z" fill="url(#carGlass)" opacity="0.9" />
          <path
            d="M352 68 L356 112 L470 112 L438 92 C418 78 386 68 352 68 Z"
            fill="url(#carGlass)"
            opacity="0.9"
          />

          {/* side accent stripe */}
          <path
            d="M120 168 L560 168"
            stroke="rgb(var(--c-green))"
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.85"
          />

          {/* headlight */}
          <ellipse cx="600" cy="176" rx="12" ry="8" fill="rgb(var(--c-panel))" opacity="0.95" />

          {/* wheels */}
          <g>
            <circle cx="172" cy="220" r="34" fill="rgb(var(--c-ink))" />
            <circle cx="172" cy="220" r="18" fill="rgb(var(--c-panel))" />
            <circle cx="172" cy="220" r="6" fill="rgb(var(--c-brand))" />
          </g>
          <g>
            <circle cx="518" cy="220" r="34" fill="rgb(var(--c-ink))" />
            <circle cx="518" cy="220" r="18" fill="rgb(var(--c-panel))" />
            <circle cx="518" cy="220" r="6" fill="rgb(var(--c-brand))" />
          </g>
        </svg>
      </motion.div>
    </div>
  );
}
