import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageProvider";
import { useDeliveryPrices } from "@/hooks/useDeliveryPrices";
import { useHoneypot } from "@/hooks/useHoneypot";
import { resolveShipping, useStoreSettings } from "@/hooks/useStoreSettings";
import { checkoutSchema, type CheckoutFormValues } from "@/lib/checkoutSchema";
import { placeOrder } from "@/lib/placeOrder";
import { orderErrorKey } from "@/lib/orderErrors";
import { Price } from "@/components/ui/Price";
import { lineDiscount } from "@/lib/offers";
import { trackInitiateCheckout, trackPurchase } from "@/lib/pixel";
import { CheckoutFields } from "./CheckoutFields";
import { Button } from "@/components/ui/Button";
import type { Product, SelectedVariant } from "@/types/db";

interface InlineCheckoutProps {
  product: Product;
  quantity: number;
  color?: string;
  size?: string;
  variants?: SelectedVariant[];
}

export function InlineCheckout({ product, quantity, color, size, variants }: InlineCheckoutProps) {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const { data: deliveryPrices = [] } = useDeliveryPrices();
  const { data: storeSettings } = useStoreSettings();
  const { isSpam } = useHoneypot();
  const [deliveryType, setDeliveryType] = useState<"home" | "office">("home");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const trackedProductId = useRef<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { delivery_type: "home" },
  });

  // This form is visible on every product-page load, so firing on mount would
  // overcount checkout intent. Track from the first real interaction instead:
  // focus events bubble, so one handler on the <form> catches any field.
  function handleFormFocus() {
    if (trackedProductId.current === product.id) return;
    trackedProductId.current = product.id;
    trackInitiateCheckout(product.id, Number(product.price) * quantity);
  }

  const selectedWilaya = watch("wilaya");
  const selectedWilayaPrice = deliveryPrices.find((dp) => dp.wilaya === selectedWilaya);
  const wilayaFee = selectedWilayaPrice
    ? deliveryType === "office"
      ? selectedWilayaPrice.office_price
      : selectedWilayaPrice.home_price
    : undefined;
  const subtotal = Number(product.price) * quantity;
  const discount = lineDiscount(product.price, quantity, product.quantity_offers);
  const shippingEstimate = resolveShipping(wilayaFee, subtotal - discount, storeSettings);

  // Same required-selection rule as the main product actions — the "Buy now"
  // submit is disabled until every axis is chosen.
  const missingSelections: string[] = [];
  if (product.colors.length > 0 && !color) missingSelections.push(t("product_color"));
  if (product.sizes.length > 0 && !size) missingSelections.push(t("product_size"));
  for (const group of product.variants) {
    if (!variants?.some((v) => v.name_fr === group.name_fr && v.value)) {
      missingSelections.push(lang === "ar" ? group.name_ar : group.name_fr);
    }
  }
  const selectionComplete = missingSelections.length === 0;

  async function onSubmit(values: CheckoutFormValues) {
    if (isSpam(values.website)) return;
    if (!selectionComplete) {
      setErrorMsg(`${t("product_choose_prefix")} ${missingSelections.join(", ")}`);
      return;
    }
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const orderNumber = await placeOrder(
        [{ product_id: product.id, quantity, color, size, variants }],
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
      navigate(`/order-confirmation/${orderNumber}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : null;
      setErrorMsg(t(orderErrorKey(message)));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} onFocus={handleFormFocus} className="space-y-4">
      <CheckoutFields
        register={register}
        errors={errors}
        deliveryPrices={deliveryPrices}
        deliveryType={deliveryType}
        onDeliveryTypeChange={setDeliveryType}
      />

      <div className="rounded-xl bg-panel-2 p-4 text-sm">
        <div className="flex justify-between text-muted">
          <span>{t("cart_subtotal")}</span>
          <Price value={subtotal} />
        </div>
        {discount > 0 && (
          <div className="mt-1 flex justify-between font-semibold text-accent">
            <span>{t("cart_discount")}</span>
            <Price value={discount} prefix="-" />
          </div>
        )}
        <div className="mt-1 flex justify-between text-muted">
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
        <div className="mt-2 flex justify-between border-t border-line pt-2 font-bold text-ink">
          <span>{t("cart_total")}</span>
          <Price value={subtotal - discount + shippingEstimate} />
        </div>
      </div>

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

      {!selectionComplete && (
        <p className="text-center text-xs font-medium text-muted">
          {t("product_choose_prefix")}{" "}
          <span className="text-ink">{missingSelections.join(", ")}</span>
        </p>
      )}

      <p className="text-center text-xs text-muted">{t("checkout_payment_notice")}</p>

      <Button
        type="submit"
        variant="accent"
        size="lg"
        className="w-full"
        disabled={submitting || !selectionComplete}
      >
        {submitting ? t("checkout_submitting") : t("product_buy_now")}
      </Button>
    </form>
  );
}
