import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageProvider";
import { useDeliveryPrices } from "@/hooks/useDeliveryPrices";
import { useHoneypot } from "@/hooks/useHoneypot";
import { resolveShipping, useStoreSettings } from "@/hooks/useStoreSettings";
import { useMediaFlags } from "@/hooks/useMediaFlags";
import { useSeo } from "@/hooks/useSeo";
import { useCartStore } from "@/store/cart";
import { checkoutSchema, type CheckoutFormValues } from "@/lib/checkoutSchema";
import { placeOrder } from "@/lib/placeOrder";
import { orderErrorKey } from "@/lib/orderErrors";
import { Price } from "@/components/ui/Price";
import { SmartImage } from "@/components/ui/SmartImage";
import { trackInitiateCheckout, trackPurchase } from "@/lib/pixel";
import { CheckoutFields } from "@/components/product/CheckoutFields";
import { Button } from "@/components/ui/Button";
import { TachometerLoader } from "@/components/effects/TachometerLoader";

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

// Position only — no opacity. This is the checkout form; a stalled rAF frame
// must never leave a paying customer looking at an invisible form.
const itemVariants: Variants = {
  hidden: { y: 16 },
  visible: { y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
};

export default function Checkout() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const discount = useCartStore((s) => s.discount());
  const clear = useCartStore((s) => s.clear);
  const { data: deliveryPrices = [] } = useDeliveryPrices();
  const { data: storeSettings } = useStoreSettings();
  const { isSpam } = useHoneypot();
  const { prefersReducedMotion } = useMediaFlags();

  const [deliveryType, setDeliveryType] = useState<"home" | "office">("home");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const hasTrackedInitiate = useRef(false);

  useSeo({ title: `${t("checkout_title")} — ${t("brand_name")}` });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { delivery_type: "home" },
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: fire once on mount only — a "has fired" ref guards re-runs
  useEffect(() => {
    if (hasTrackedInitiate.current || items.length === 0) return;
    hasTrackedInitiate.current = true;
    trackInitiateCheckout("cart", subtotal);
  }, []);

  const selectedWilaya = watch("wilaya");
  const selectedWilayaPrice = deliveryPrices.find((dp) => dp.wilaya === selectedWilaya);
  const wilayaFee = selectedWilayaPrice
    ? deliveryType === "office"
      ? selectedWilayaPrice.office_price
      : selectedWilayaPrice.home_price
    : undefined;
  const shippingEstimate = resolveShipping(wilayaFee, subtotal - discount, storeSettings);

  if (items.length === 0) {
    return <Navigate to="/shop" replace />;
  }

  async function onSubmit(values: CheckoutFormValues) {
    if (isSpam(values.website)) return;
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const orderNumber = await placeOrder(
        items.map((item) => ({
          product_id: item.productId,
          quantity: item.quantity,
          color: item.color,
          size: item.size,
          variants: item.variants,
        })),
        {
          customer_name: values.customer_name,
          customer_phone: values.customer_phone,
          wilaya: values.wilaya,
          city: values.city,
          delivery_type: deliveryType,
          language: lang,
        }
      );
      trackPurchase(orderNumber, subtotal - discount + shippingEstimate);
      clear();
      navigate(`/order-confirmation/${orderNumber}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : null;
      setErrorMsg(t(orderErrorKey(message)));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-8 font-heading text-2xl font-extrabold text-ink sm:text-3xl">
        {t("checkout_title")}
      </h1>

      <motion.div
        className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]"
        variants={containerVariants}
        initial={prefersReducedMotion ? false : "hidden"}
        animate="visible"
      >
        <motion.form
          variants={itemVariants}
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5"
        >
          <h2 className="font-heading text-lg font-bold text-ink">{t("checkout_customer_info")}</h2>
          <CheckoutFields
            register={register}
            errors={errors}
            deliveryPrices={deliveryPrices}
            deliveryType={deliveryType}
            onDeliveryTypeChange={setDeliveryType}
          />

          <AnimatePresence>
            {errorMsg && (
              <motion.p
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                className="overflow-hidden rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500"
              >
                {errorMsg}
              </motion.p>
            )}
          </AnimatePresence>

          <p className="text-xs text-muted">{t("checkout_payment_notice")}</p>

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? (
              <span className="flex items-center gap-2">
                <TachometerLoader
                  size="sm"
                  className="[&_.fill-brand]:fill-white [&_.stroke-brand]:stroke-white"
                />
                {t("checkout_submitting")}
              </span>
            ) : (
              t("checkout_submit")
            )}
          </Button>
        </motion.form>

        <motion.aside
          variants={itemVariants}
          className="h-fit rounded-2xl border border-line bg-panel p-5"
        >
          <h2 className="mb-4 font-heading text-base font-bold text-ink">
            {t("checkout_summary")}
          </h2>
          <div className="max-h-64 space-y-3 overflow-y-auto">
            {items.map((item) => (
              <div
                key={`${item.productId}-${item.color}-${item.size}-${(item.variants ?? []).map((v) => v.value).join(",")}`}
                className="flex gap-3 rounded-lg p-1.5 transition-colors hover:bg-panel-2/60"
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-panel-2">
                  {item.imageUrl && (
                    <SmartImage
                      src={item.imageUrl}
                      alt=""
                      sizes="56px"
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1">
                  <p className="line-clamp-1 text-sm font-semibold text-ink">
                    {lang === "ar" ? item.nameAr : item.nameFr}
                  </p>
                  <p className="text-xs text-muted">
                    {item.quantity} × <Price value={item.price} />
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm">
            <div className="flex justify-between text-muted">
              <span>{t("cart_subtotal")}</span>
              <Price value={subtotal} />
            </div>
            {discount > 0 && (
              <div className="flex justify-between font-semibold text-accent">
                <span>{t("cart_discount")}</span>
                <Price value={discount} prefix="-" />
              </div>
            )}
            <div className="flex justify-between text-muted">
              <span>{t("cart_shipping")}</span>
              {/* No wilaya picked yet = unknown, not free. */}
              <span
                className={
                  wilayaFee !== undefined && shippingEstimate === 0
                    ? "font-semibold text-accent"
                    : undefined
                }
              >
                {wilayaFee === undefined ? (
                  "—"
                ) : shippingEstimate === 0 ? (
                  t("cart_shipping_free")
                ) : (
                  <Price value={shippingEstimate} />
                )}
              </span>
            </div>
            <div className="flex justify-between border-t border-line pt-2 font-bold text-ink">
              <span>{t("cart_total")}</span>
              <Price value={subtotal - discount + shippingEstimate} />
            </div>
          </div>
        </motion.aside>
      </motion.div>
    </div>
  );
}
