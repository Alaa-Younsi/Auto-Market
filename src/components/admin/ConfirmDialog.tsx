import { type ReactNode, useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";
import { Button } from "@/components/ui/Button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  busy?: boolean;
  /** Shown inside the dialog, so a failed delete is not reported somewhere off-screen. */
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * The one destructive-action dialog of the admin. Replaces window.confirm(),
 * which can't say WHAT is being deleted, can't be styled, and is silently
 * suppressed by some in-app browsers (the confirm returns false, nothing happens).
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  busy = false,
  error,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const { t } = useLanguage();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={busy ? undefined : onClose}
          />
          <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
            <motion.div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="confirm-dialog-title"
              className="pointer-events-auto w-full max-w-md rounded-2xl border border-line bg-panel p-5 shadow-2xl sm:p-6"
              initial={{ y: 24, scale: 0.98 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 24, scale: 0.98, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                    <AlertTriangle size={20} />
                  </div>
                  <h2
                    id="confirm-dialog-title"
                    className="font-heading text-lg font-bold text-ink [overflow-wrap:anywhere]"
                  >
                    {title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={busy}
                  className="rounded-full p-1.5 text-muted transition-colors hover:bg-panel-2 hover:text-ink disabled:opacity-50"
                  aria-label={t("admin_cancel")}
                >
                  <X size={18} />
                </button>
              </div>

              {children && (
                <div className="mt-4 space-y-2 text-sm leading-relaxed text-muted">{children}</div>
              )}
              {error && (
                <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500">
                  {error}
                </p>
              )}

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
                  {t("admin_cancel")}
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={onConfirm}
                  disabled={busy}
                  className="!bg-red-500 !text-white hover:!bg-red-600"
                >
                  {busy ? "…" : confirmLabel}
                </Button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

interface AskOptions {
  title: string;
  body?: ReactNode;
  confirmLabel: string;
}

/**
 * Promise-style confirmation for simple deletes:
 *   const [dialog, ask] = useConfirm();
 *   if (!(await ask({ title, body, confirmLabel }))) return;
 * Render `dialog` once in the page.
 */
export function useConfirm(): [ReactNode, (o: AskOptions) => Promise<boolean>] {
  const [state, setState] = useState<(AskOptions & { resolve: (v: boolean) => void }) | null>(null);
  const ask = useCallback(
    (o: AskOptions) => new Promise<boolean>((resolve) => setState({ ...o, resolve })),
    []
  );
  const close = (v: boolean) => {
    state?.resolve(v);
    setState(null);
  };
  const dialog = (
    <ConfirmDialog
      open={state !== null}
      title={state?.title ?? ""}
      confirmLabel={state?.confirmLabel ?? ""}
      onConfirm={() => close(true)}
      onClose={() => close(false)}
    >
      {state?.body}
    </ConfirmDialog>
  );
  return [dialog, ask];
}
