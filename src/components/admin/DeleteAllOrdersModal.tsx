import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Download, X } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";
import { Button } from "@/components/ui/Button";

interface DeleteAllOrdersModalProps {
  open: boolean;
  count: number;
  deleting: boolean;
  onClose: () => void;
  onDownload: () => void;
  onConfirm: () => void;
}

export function DeleteAllOrdersModal({
  open,
  count,
  deleting,
  onClose,
  onDownload,
  onConfirm,
}: DeleteAllOrdersModalProps) {
  const { t } = useLanguage();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={deleting ? undefined : onClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              role="dialog"
              aria-modal="true"
              className="w-full max-w-md rounded-2xl border border-line bg-panel p-5 shadow-2xl sm:p-6"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                    <AlertTriangle size={20} />
                  </div>
                  <h2 className="font-heading text-lg font-bold text-ink">
                    {t("admin_delete_all_title")}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  disabled={deleting}
                  className="rounded-full p-1.5 text-muted transition-colors hover:bg-panel-2 hover:text-ink disabled:opacity-50"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-muted">
                {t("admin_delete_all_body_pre")} <span className="font-bold text-ink">{count}</span>{" "}
                {t("admin_delete_all_body_post")}
              </p>

              <div className="mt-6 flex flex-col gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onDownload}
                  disabled={deleting}
                  className="w-full"
                >
                  <Download size={16} />
                  {t("admin_delete_all_download_first")}
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={onConfirm}
                  disabled={deleting}
                  className="w-full !bg-red-500 !text-white hover:!bg-red-600"
                >
                  {deleting ? t("admin_delete_all_deleting") : t("admin_delete_all_confirm_button")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onClose}
                  disabled={deleting}
                  className="w-full"
                >
                  {t("admin_delete_all_cancel")}
                </Button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
