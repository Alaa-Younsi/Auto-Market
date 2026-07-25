import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { LinkButton } from "@/components/ui/LinkButton";
import { useCartStore } from "@/store/cart";
import { useLanguage } from "@/i18n/LanguageProvider";
import { useMediaFlags } from "@/hooks/useMediaFlags";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import { Price } from "@/components/ui/Price";

const ROW_TRANSITION = { type: "spring", damping: 28, stiffness: 260 } as const;

export function CartDrawer() {
  const { t, lang } = useLanguage();
  const { prefersReducedMotion } = useMediaFlags();
  const isOpen = useCartStore((s) => s.isOpen);
  const close = useCartStore((s) => s.close);
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const subtotal = useCartStore((s) => s.subtotal());
  const discount = useCartStore((s) => s.discount());
  const animatedTotal = useAnimatedNumber(subtotal - discount, {
    duration: 0.5,
    enabled: !prefersReducedMotion,
  });

  return (
    <Drawer open={isOpen} onClose={close} title={t("cart_title")}>
      {items.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="animate-float rounded-full bg-panel-2 p-5">
            <ShoppingBag size={32} className="text-muted" />
          </div>
          <p className="text-muted">{t("cart_empty")}</p>
          <LinkButton to="/shop" variant="outline" onClick={close}>
            {t("cart_empty_cta")}
          </LinkButton>
        </div>
      ) : (
        <div className="flex h-full flex-col">
          <div className="flex-1 overflow-y-auto px-5">
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <motion.div
                  key={`${item.productId}-${item.color}-${item.size}-${(item.variants ?? []).map((v) => v.value).join(",")}`}
                  layout={!prefersReducedMotion}
                  initial={prefersReducedMotion ? false : { opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0, height: "auto" }}
                  exit={
                    prefersReducedMotion
                      ? { opacity: 0 }
                      : { opacity: 0, x: -40, height: 0, marginTop: 0, marginBottom: 0 }
                  }
                  transition={ROW_TRANSITION}
                  className="flex gap-3 overflow-hidden border-b border-line py-4"
                >
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-panel-2">
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        {lang === "ar" ? item.nameAr : item.nameFr}
                      </p>
                      {(item.color || item.size || (item.variants?.length ?? 0) > 0) && (
                        <p className="text-xs text-muted">
                          {[
                            item.color,
                            item.size,
                            ...(item.variants ?? []).map((v) =>
                              lang === "ar" ? `${v.name_ar}: ${v.value}` : `${v.name_fr}: ${v.value}`
                            ),
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 rounded-lg border border-line">
                        <button
                          className="p-1.5 text-muted hover:text-ink"
                          onClick={() =>
                            updateQuantity(item.productId, item.quantity - 1, item.color, item.size, item.variants)
                          }
                        >
                          <Minus size={14} />
                        </button>
                        <span className="relative flex w-5 justify-center overflow-hidden text-sm">
                          <AnimatePresence mode="popLayout" initial={false}>
                            <motion.span
                              key={item.quantity}
                              initial={prefersReducedMotion ? false : { y: 8, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              exit={{ y: -8, opacity: 0 }}
                              transition={{ duration: 0.18 }}
                            >
                              {item.quantity}
                            </motion.span>
                          </AnimatePresence>
                        </span>
                        <button
                          className="p-1.5 text-muted hover:text-ink"
                          onClick={() =>
                            updateQuantity(item.productId, item.quantity + 1, item.color, item.size, item.variants)
                          }
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <Price
                        value={item.price * item.quantity}
                        className="text-sm font-bold text-brand"
                      />
                    </div>
                  </div>
                  <button
                    className="self-start p-1 text-muted hover:text-red-500"
                    onClick={() => removeItem(item.productId, item.color, item.size, item.variants)}
                    aria-label={t("cart_remove")}
                  >
                    <Trash2 size={16} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="border-t border-line px-5 py-5">
            {discount > 0 && (
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="text-muted">{t("cart_discount")}</span>
                <Price value={discount} prefix="-" className="font-bold text-accent" />
              </div>
            )}
            <div className="mb-4 flex items-center justify-between text-sm">
              <span className="text-muted">{t("cart_subtotal")}</span>
              <Price value={animatedTotal} className="font-bold text-ink" />
            </div>
            <LinkButton to="/checkout" onClick={close} className="w-full" size="lg">
              {t("cart_checkout")}
            </LinkButton>
          </div>
        </div>
      )}
    </Drawer>
  );
}
