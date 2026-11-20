import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MessageCircle, Phone, Trash2 } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";
import { useOrder } from "@/hooks/useOrders";
import { dzPhoneToIntl } from "@/lib/contact";
import { formatDate, formatPrice } from "@/lib/format";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABEL_KEY,
  deleteOrder,
  updateOrderStatus,
} from "@/lib/orderStatus";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { Price } from "@/components/ui/Price";
import { SmartImage } from "@/components/ui/SmartImage";
import { BentoPanel } from "@/components/ui/BentoPanel";
import { Select } from "@/components/ui/Select";
import type { OrderStatus } from "@/types/db";
import type { TranslationKey } from "@/i18n/translations";

export default function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { t, lang } = useLanguage();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useOrder(id);
  const [error, setError] = useState<TranslationKey | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function updateStatus(newStatus: OrderStatus) {
    if (!id) return;
    setError(null);
    setSaving(true);
    // Re-opening a cancelled order re-reserves its stock; the trigger refuses
    // when those units have been sold since (admin_order_reopen_stock).
    setError(await updateOrderStatus(queryClient, id, newStatus));
    setSaving(false);
  }

  async function handleDelete() {
    if (!id) return;
    setDeleting(true);
    setDeleteError(null);
    const err = await deleteOrder(queryClient, id);
    setDeleting(false);
    if (err) {
      setDeleteError(t(err));
      return;
    }
    navigate("/admin/orders", { replace: true });
  }

  if (isLoading) {
    return <p className="text-muted">{t("loading")}</p>;
  }
  if (isError || !data) {
    return (
      <div className="space-y-4">
        <p className="text-muted">{t(isError ? "admin_load_error" : "admin_order_not_found")}</p>
        <Link to="/admin/orders" className="text-sm font-semibold text-brand hover:underline">
          {t("admin_back_to_orders")}
        </Link>
      </div>
    );
  }

  const { order, items } = data;
  const intlPhone = dzPhoneToIntl(order.customer_phone);
  // Pre-filled confirmation message, in the language the customer ordered in.
  const waText =
    order.language === "ar"
      ? `السلام عليكم ${order.customer_name}، معكم Auto Market بخصوص طلبك رقم ${order.order_number} (المجموع ${formatPrice(order.total)}). هل تؤكد الطلب؟`
      : `Bonjour ${order.customer_name}, ici Auto Market au sujet de votre commande ${order.order_number} (total ${formatPrice(order.total)}). Pouvez-vous confirmer la commande ?`;

  return (
    <div>
      <Link
        to="/admin/orders"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-brand"
      >
        <ArrowLeft size={15} className="rtl:rotate-180" />
        {t("admin_back_to_orders")}
      </Link>
      <h1 className="mb-6 font-heading text-2xl font-extrabold text-ink">
        {t("admin_order_detail_title")}
      </h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <BentoPanel className="p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <span dir="ltr" className="font-mono text-sm font-bold text-ink">
              {order.order_number}
            </span>
            <span className="text-xs text-muted">{formatDate(order.created_at, lang)}</span>
          </div>

          <h2 className="mb-3 font-heading text-sm font-bold text-ink">{t("admin_order_items")}</h2>
          <div className="divide-y divide-line">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-panel-2">
                  {item.image_url && (
                    <SmartImage
                      src={item.image_url}
                      alt=""
                      sizes="48px"
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
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
                <Price
                  value={item.price * item.quantity}
                  className="w-20 text-end text-sm font-bold text-ink"
                />
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-1 border-t border-line pt-4 text-sm">
            <div className="flex justify-between text-muted">
              <span>{t("cart_subtotal")}</span>
              <Price value={order.subtotal} />
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between font-semibold text-accent">
                <span>{t("cart_discount")}</span>
                <Price value={order.discount} prefix="-" />
              </div>
            )}
            <div className="flex justify-between text-muted">
              <span>{t("cart_shipping")}</span>
              <Price value={order.shipping} />
            </div>
            <div className="flex justify-between border-t border-line pt-2 text-base font-bold text-ink">
              <span>{t("cart_total")}</span>
              <Price value={order.total} className="text-brand" />
            </div>
          </div>
        </BentoPanel>

        <div className="space-y-4">
          <BentoPanel className="space-y-3 p-5 text-sm">
            <h2 className="font-heading text-sm font-bold text-ink">{t("admin_order_customer")}</h2>
            <p className="text-ink" dir="auto">
              {order.customer_name}
            </p>
            <p className="text-muted">
              <bdi dir="ltr">{order.customer_phone}</bdi>
            </p>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={`tel:+${intlPhone}`}
                className="flex items-center justify-center gap-2 rounded-xl border border-line px-3 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-brand hover:text-brand"
              >
                <Phone size={15} />
                {t("admin_call")}
              </a>
              <a
                href={`https://wa.me/${intlPhone}?text=${encodeURIComponent(waText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl bg-accent/15 px-3 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/25"
              >
                <MessageCircle size={15} />
                WhatsApp
              </a>
            </div>
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
            <Select
              value={order.status}
              disabled={saving}
              aria-label={t("admin_order_update_status")}
              onChange={(e) => updateStatus(e.target.value as OrderStatus)}
            >
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(ORDER_STATUS_LABEL_KEY[s])}
                </option>
              ))}
            </Select>
            {error && <p className="text-sm text-red-500">{t(error)}</p>}
          </BentoPanel>

          <BentoPanel className="p-5">
            <Button
              type="button"
              variant="danger"
              className="w-full"
              onClick={() => {
                setDeleteError(null);
                setConfirmOpen(true);
              }}
            >
              <Trash2 size={16} />
              {t("admin_order_delete")}
            </Button>
          </BentoPanel>
        </div>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title={`${t("admin_order_delete_title")} ${order.order_number}`}
        confirmLabel={t("admin_order_delete")}
        busy={deleting}
        error={deleteError}
        onConfirm={handleDelete}
        onClose={() => setConfirmOpen(false)}
      >
        <p>
          <span className="font-semibold text-ink" dir="auto">
            {order.customer_name}
          </span>{" "}
          · <Price value={order.total} />
        </p>
        <p>{t("admin_order_delete_body")}</p>
        {order.status !== "cancelled" && (
          <p className="text-amber-500">{t("admin_order_delete_stock_note")}</p>
        )}
      </ConfirmDialog>
    </div>
  );
}
