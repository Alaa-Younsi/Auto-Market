import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  side?: "start" | "end";
}

export function Drawer({ open, onClose, title, children, side = "end" }: DrawerProps) {
  const { dir } = useLanguage();
  const physicalSide = side === "end" ? (dir === "rtl" ? "left" : "right") : dir === "rtl" ? "right" : "left";
  const offscreenX = physicalSide === "left" ? "-100%" : "100%";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed top-0 z-50 flex h-full w-full max-w-md flex-col bg-panel shadow-2xl"
            style={{ [physicalSide]: 0 }}
            initial={{ x: offscreenX }}
            animate={{ x: 0 }}
            exit={{ x: offscreenX }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="font-heading text-lg font-bold text-ink">{title}</h2>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-muted transition-colors hover:bg-panel-2 hover:text-ink"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
