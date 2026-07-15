import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Download, Trash2 } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";
import { useOrders } from "@/hooks/useOrders";
import { supabase } from "@/lib/supabase";
import { formatPrice, formatDate } from "@/lib/format";
import { exportOrdersToExcel } from "@/lib/exportOrders";
import { ORDER_STATUS_LABEL_KEY } from "@/lib/orderStatus";
import { BentoPanel } from "@/components/ui/BentoPanel";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DeleteAllOrdersModal } from "@/components/admin/DeleteAllOrdersModal";
import type { OrderStatus } from "@/types/db";

const STATUS_TONE: Record<OrderStatus, "brand" | "accent" | "muted" | "danger"> = {
  pending: "muted",
  confirmed: "brand",
  shipped: "brand",
  delivered: "accent",
  cancelled: "danger",
};

export default function AdminOrders() {
  const { t, lang } = useLanguage();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { data: orders = [], isLoading } = useOrders({ status });

  async function handleDeleteAll() {
    setDeleting(true);
    const { error } = await supabase.from("orders").delete().not("id", "is", null);
    setDeleting(false);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    setConfirmOpen(false);
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <h1 className="font-heading text-2xl font-extrabold text-ink">
          {t("admin_orders_title")}
        </h1>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={orders.length === 0}
              onClick={() => exportOrdersToExcel(orders)}
              className="flex-1 sm:flex-initial"
            >
              <Download size={16} />
              {t("admin_export_orders")}
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={orders.length === 0}
              onClick={() => setConfirmOpen(true)}
              className="flex-1 sm:flex-initial"
            >
              <Trash2 size={16} />
              {t("admin_delete_all_orders")}
            </Button>
          </div>

          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as OrderStatus | "all")}
            className="w-auto"
          >
            <option value="all">{t("admin_order_filter_all")}</option>
            <option value="pending">{t("track_status_pending")}</option>
            <option value="confirmed">{t("track_status_confirmed")}</option>
            <option value="shipped">{t("track_status_shipped")}</option>
            <option value="delivered">{t("track_status_delivered")}</option>
            <option value="cancelled">{t("track_status_cancelled")}</option>
          </Select>
        </div>
      </div>

      <DeleteAllOrdersModal
        open={confirmOpen}
        count={orders.length}
        deleting={deleting}
        onClose={() => setConfirmOpen(false)}
        onDownload={() => exportOrdersToExcel(orders)}
        onConfirm={handleDeleteAll}
      />

      <BentoPanel className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-start text-xs text-muted">
              <th className="whitespace-nowrap px-4 py-3 text-start font-semibold">{t("admin_order_number")}</th>
              <th className="whitespace-nowrap px-4 py-3 text-start font-semibold">{t("admin_order_customer")}</th>
              <th className="hidden whitespace-nowrap px-4 py-3 text-start font-semibold sm:table-cell">{t("admin_order_wilaya")}</th>
              <th className="whitespace-nowrap px-4 py-3 text-start font-semibold">{t("admin_order_total")}</th>
              <th className="whitespace-nowrap px-4 py-3 text-start font-semibold">{t("admin_order_status")}</th>
              <th className="hidden whitespace-nowrap px-4 py-3 text-start font-semibold md:table-cell">{t("admin_order_date")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  {t("loading")}
                </td>
              </tr>
            )}
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-line last:border-0">
                <td className="whitespace-nowrap px-4 py-3">
                  <Link
                    to={`/admin/orders/${order.id}`}
                    className="font-mono text-brand hover:underline"
                  >
                    {order.order_number}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-4 py-3">{order.customer_name}</td>
                <td className="hidden whitespace-nowrap px-4 py-3 sm:table-cell">{order.wilaya}</td>
                <td className="whitespace-nowrap px-4 py-3 font-semibold">{formatPrice(order.total)}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <Badge tone={STATUS_TONE[order.status]}>
                    {t(ORDER_STATUS_LABEL_KEY[order.status])}
                  </Badge>
                </td>
                <td className="hidden whitespace-nowrap px-4 py-3 text-muted md:table-cell">{formatDate(order.created_at, lang)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </BentoPanel>
    </div>
  );
}
