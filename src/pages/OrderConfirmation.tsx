import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Copy } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";
import { useSeo } from "@/hooks/useSeo";
import { getOrderByNumber } from "@/lib/placeOrder";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LinkButton } from "@/components/ui/LinkButton";

interface OrderRecap {
  order_number: string;
  customer_name: string;
  wilaya: string;
  city: string;
  subtotal: number;
  shipping: number;
  discount?: number;
  total: number;
  items: Array<{ name_fr: string; name_ar: string; quantity: number; price: number }>;
}

export default function OrderConfirmation() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const { t, lang } = useLanguage();
  const [order, setOrder] = useState<OrderRecap | null>(null);
  const [copied, setCopied] = useState(false);

  useSeo({ title: `${t("confirmation_title")} — ${t("brand_name")}` });

  useEffect(() => {
    if (!orderNumber) return;
    getOrderByNumber(orderNumber).then((data) => setOrder(data as OrderRecap | null));
  }, [orderNumber]);

  function copyNumber() {
    if (!orderNumber) return;
    navigator.clipboard.writeText(orderNumber).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
      {/* Chequered flag behind the tick — the order crossed the finish line. */}
      <div className="relative mx-auto h-20 w-20">
        <motion.div
          aria-hidden="true"
          className="fx-checker absolute inset-0 rounded-full"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1.35, opacity: [0, 0.9, 0] }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        />
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 14, stiffness: 200 }}
          className="relative flex h-20 w-20 items-center justify-center rounded-full bg-accent/10 text-accent"
        >
          <CheckCircle2 size={44} />
        </motion.div>
      </div>

      <h1 className="mt-6 font-heading text-2xl font-extrabold text-ink sm:text-3xl">
        {t("confirmation_title")}
      </h1>
      <p className="mt-2 text-sm text-muted">{t("confirmation_subtitle")}</p>

      <div className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-line bg-panel-2 px-4 py-3">
        <span className="text-xs text-muted">{t("confirmation_number")}</span>
        <span className="font-mono text-sm font-bold text-ink">{orderNumber}</span>
        <button onClick={copyNumber} className="text-muted hover:text-brand" aria-label="Copy">
          <Copy size={14} />
        </button>
        {copied && <span className="text-xs text-accent">✓</span>}
      </div>

      {order && (
        <div className="mt-6 rounded-2xl border border-line bg-panel p-5 text-start">
          <p className="text-sm text-muted">
            {order.customer_name} · {order.wilaya}, {order.city}
          </p>
          <div className="mt-3 divide-y divide-line">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between py-2 text-sm">
                <span className="text-ink">
                  {(lang === "ar" ? item.name_ar : item.name_fr)} × {item.quantity}
                </span>
                <span className="font-semibold text-ink">
                  {formatPrice(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>
          {(order.discount ?? 0) > 0 && (
            <div className="mt-3 flex justify-between border-t border-line pt-3 text-sm font-semibold text-accent">
              <span>{t("cart_discount")}</span>
              <span>-{formatPrice(order.discount ?? 0)}</span>
            </div>
          )}
          <div className={cn(
            "flex justify-between text-sm",
            (order.discount ?? 0) > 0 ? "mt-1" : "mt-3 border-t border-line pt-3"
          )}>
            <span className="text-muted">{t("cart_shipping")}</span>
            <span>{formatPrice(order.shipping)}</span>
          </div>
          <div className="mt-1 flex justify-between text-base font-bold text-ink">
            <span>{t("cart_total")}</span>
            <span className="text-brand">{formatPrice(order.total)}</span>
          </div>
        </div>
      )}

      <p className="mt-6 text-sm text-muted">{t("confirmation_message")}</p>

      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <LinkButton to="/" variant="secondary">
          {t("confirmation_back_home")}
        </LinkButton>
        <LinkButton to="/shop">{t("cart_empty_cta")}</LinkButton>
      </div>
    </div>
  );
}
