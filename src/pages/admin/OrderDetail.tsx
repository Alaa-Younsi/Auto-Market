import { useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/i18n/LanguageProvider";
import { useOrder } from "@/hooks/useOrders";
import { supabase } from "@/lib/supabase";
import { formatPrice, formatDate } from "@/lib/format";
import { BentoPanel } from "@/components/ui/BentoPanel";
import { Select } from "@/components/ui/Select";
import type { OrderStatus } from "@/types/db";

export default function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { t, lang } = useLanguage();
  const queryClient = useQueryClient();
  const { data, isLoading } = useOrder(id);

  async function updateStatus(newStatus: OrderStatus) {
    if (!id) return;
    await supabase.from("orders").update({ status: newStatus }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["order", id] });
    queryClient.invalidateQueries({ queryKey: ["orders"] });
  }

  if (isLoading || !data) {
    return <p className="text-muted">{t("loading")}</p>;
  }

  const { order, items } = data;

  return (
    <div>
      <h1 className="mb-6 font-heading text-2xl font-extrabold text-ink">
        {t("admin_order_detail_title")}
      </h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <BentoPanel className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <span className="font-mono text-sm font-bold text-ink">{order.order_number}</span>
            <span className="text-xs text-muted">{formatDate(order.created_at, lang)}</span>
          </div>

          <h2 className="mb-3 font-heading text-sm font-bold text-ink">
            {t("admin_order_items")}
          </h2>
          <div className="divide-y divide-line">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-panel-2">
                  {item.image_url && (
                    <img src={item.image_url} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-ink">
                    {lang === "ar" ? item.name_ar : item.name_fr}
                  </p>
                  {(item.color || item.size || item.variants.length > 0) && (
                    <p className="text-xs text-muted">
                      {[
                        item.color,
                        item.size,
                        ...item.variants.map((v) =>
                          lang === "ar" ? `${v.name_ar}: ${v.value}` : `${v.name_fr}: ${v.value}`
                        ),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </div>
                <p className="text-sm text-muted">× {item.quantity}</p>
                <p className="w-20 text-end text-sm font-bold text-ink">
                  {formatPrice(item.price * item.quantity)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-1 border-t border-line pt-4 text-sm">
            <div className="flex justify-between text-muted">
              <span>{t("cart_subtotal")}</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between font-semibold text-accent">
                <span>{t("cart_discount")}</span>
                <span>-{formatPrice(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-muted">
              <span>{t("cart_shipping")}</span>
              <span>{formatPrice(order.shipping)}</span>
            </div>
            <div className="flex justify-between border-t border-line pt-2 text-base font-bold text-ink">
              <span>{t("cart_total")}</span>
              <span className="text-brand">{formatPrice(order.total)}</span>
            </div>
          </div>
        </BentoPanel>

        <div className="space-y-4">
          <BentoPanel className="space-y-3 p-5 text-sm">
            <h2 className="font-heading text-sm font-bold text-ink">
              {t("checkout_customer_info")}
            </h2>
            <p className="text-ink">{order.customer_name}</p>
            <p className="text-muted">{order.customer_phone}</p>
            <p className="text-muted">
              {order.wilaya}, {order.city}
            </p>
            {/* Both were dropped from checkout; older orders still carry them. */}
            {order.address && <p className="text-muted">{order.address}</p>}
            {order.notes && <p className="italic text-muted">"{order.notes}"</p>}
          </BentoPanel>

          <BentoPanel className="space-y-3 p-5">
            <h2 className="font-heading text-sm font-bold text-ink">
              {t("admin_order_update_status")}
            </h2>
            <Select value={order.status} onChange={(e) => updateStatus(e.target.value as OrderStatus)}>
              <option value="pending">{t("track_status_pending")}</option>
              <option value="confirmed">{t("track_status_confirmed")}</option>
              <option value="shipped">{t("track_status_shipped")}</option>
              <option value="delivered">{t("track_status_delivered")}</option>
              <option value="cancelled">{t("track_status_cancelled")}</option>
            </Select>
          </BentoPanel>
        </div>
      </div>
    </div>
  );
}
