import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { DollarSign, Package, ShoppingCart, Timer } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";
import { useOrders } from "@/hooks/useOrders";
import { supabase } from "@/lib/supabase";
import { Price } from "@/components/ui/Price";
import { ORDER_STATUS_LABEL_KEY } from "@/lib/orderStatus";
import { BentoPanel } from "@/components/ui/BentoPanel";
import { Badge } from "@/components/ui/Badge";

export default function AdminDashboard() {
  const { t } = useLanguage();
  const { data: orders = [] } = useOrders();
  const { data: pendingOrders = [] } = useOrders({ status: "pending" });

  const { data: productsCount = 0 } = useQuery({
    queryKey: ["admin-products-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");
      return count ?? 0;
    },
  });

  const revenue = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + o.total, 0);

  const stats = [
    { label: t("admin_dashboard_total_orders"), value: orders.length, icon: ShoppingCart },
    { label: t("admin_dashboard_pending_orders"), value: pendingOrders.length, icon: Timer },
    { label: t("admin_dashboard_revenue"), value: <Price value={revenue} />, icon: DollarSign },
    { label: t("admin_dashboard_products"), value: productsCount, icon: Package },
  ];

  return (
    <div>
      <h1 className="mb-6 font-heading text-2xl font-extrabold text-ink">
        {t("admin_dashboard_title")}
      </h1>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <BentoPanel key={stat.label} className="p-4 sm:p-5">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand sm:h-10 sm:w-10">
              <stat.icon size={18} />
            </div>
            <p className="font-heading text-lg font-extrabold text-ink sm:text-xl">{stat.value}</p>
            <p className="text-xs text-muted">{stat.label}</p>
          </BentoPanel>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="mb-4 font-heading text-base font-bold text-ink">
          {t("admin_dashboard_recent_orders")}
        </h2>
        <BentoPanel className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-start text-xs text-muted">
                <th className="whitespace-nowrap px-4 py-3 text-start font-semibold">
                  {t("admin_order_number")}
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-start font-semibold">
                  {t("admin_order_customer")}
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-start font-semibold">
                  {t("admin_order_total")}
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-start font-semibold">
                  {t("admin_order_status")}
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 8).map((order) => (
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
                  <td className="whitespace-nowrap px-4 py-3 font-semibold">
                    <Price value={order.total} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <Badge tone="brand">{t(ORDER_STATUS_LABEL_KEY[order.status])}</Badge>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted">
                    —
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </BentoPanel>
      </div>
    </div>
  );
}
