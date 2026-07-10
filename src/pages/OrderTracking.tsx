import { useState } from "react";
import { Search } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";
import { useSeo } from "@/hooks/useSeo";
import { getOrderByNumber } from "@/lib/placeOrder";
import { formatPrice, formatDate } from "@/lib/format";
import { TachometerLoader } from "@/components/effects/TachometerLoader";
import { RoadTimeline } from "@/components/effects/RoadTimeline";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { TranslationKey } from "@/i18n/translations";

interface OrderRecap {
  order_number: string;
  customer_name: string;
  wilaya: string;
  city: string;
  status: string;
  created_at: string;
  subtotal: number;
  shipping: number;
  total: number;
  items: Array<{ name_fr: string; name_ar: string; quantity: number; price: number }>;
}

const STATUS_KEY: Record<string, TranslationKey> = {
  pending: "track_status_pending",
  confirmed: "track_status_confirmed",
  shipped: "track_status_shipped",
  delivered: "track_status_delivered",
  cancelled: "track_status_cancelled",
};

export default function OrderTracking() {
  const { t, lang } = useLanguage();
  const [input, setInput] = useState("");
  const [order, setOrder] = useState<OrderRecap | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);

  useSeo({ title: `${t("track_title")} — ${t("brand_name")}` });

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    setNotFound(false);
    setOrder(null);
    try {
      const data = await getOrderByNumber(input.trim());
      if (data) {
        setOrder(data as OrderRecap);
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <h1 className="text-center font-heading text-2xl font-extrabold text-ink sm:text-3xl">
        {t("track_title")}
      </h1>

      <form onSubmit={handleSearch} className="mt-8 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("track_input_placeholder")}
        />
        <Button type="submit" disabled={loading}>
          <Search size={16} />
        </Button>
      </form>

      {loading && <TachometerLoader className="mt-10" label={t("loading")} />}

      {notFound && (
        <p className="mt-4 text-center text-sm text-red-500">{t("track_not_found")}</p>
      )}

      {order && (
        <div className="mt-8 rounded-2xl border border-line bg-panel p-5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm font-bold text-ink">{order.order_number}</span>
            <Badge tone={order.status === "cancelled" ? "danger" : "brand"}>
              {t(STATUS_KEY[order.status] ?? "track_status_pending")}
            </Badge>
          </div>
          <RoadTimeline status={order.status} />
          <p className="mt-1 text-xs text-muted">{formatDate(order.created_at, lang)}</p>
          <p className="mt-3 text-sm text-muted">
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
          <div className="mt-3 flex justify-between border-t border-line pt-3 text-base font-bold text-ink">
            <span>{t("cart_total")}</span>
            <span className="text-brand">{formatPrice(order.total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
