import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Download, Search, Trash2, TriangleAlert } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";
import type { TranslationKey } from "@/i18n/translations";
import { useOrders } from "@/hooks/useOrders";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { exportOrdersToExcel } from "@/lib/exportOrders";
import {
  ORDER_STATUSES,
  ORDER_STATUS_DOT,
  ORDER_STATUS_LABEL_KEY,
  deleteOrder,
  updateOrderStatus,
} from "@/lib/orderStatus";
import { Price } from "@/components/ui/Price";
import { BentoPanel } from "@/components/ui/BentoPanel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DeleteAllOrdersModal } from "@/components/admin/DeleteAllOrdersModal";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import type { Order, OrderStatus } from "@/types/db";

/** Accent-insensitive, case-insensitive ("Aïcha" finds "aicha"). */
function norm(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function StatusPicker({
  order,
  busy,
  onChange,
}: {
  order: Order;
  busy: boolean;
  onChange: (status: OrderStatus) => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="relative w-full min-w-[8.5rem]">
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute start-3 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full",
          ORDER_STATUS_DOT[order.status]
        )}
      />
      <select
        aria-label={`${t("admin_order_status")} ${order.order_number}`}
        value={order.status}
        disabled={busy}
        onChange={(e) => onChange(e.target.value as OrderStatus)}
        className="w-full appearance-none rounded-lg border border-line bg-panel-2 py-1.5 ps-7 pe-7 text-xs font-semibold text-ink outline-none transition-colors hover:border-brand/60 focus:border-brand disabled:opacity-60"
      >
        {ORDER_STATUSES.map((s) => (
          <option key={s} value={s}>
            {t(ORDER_STATUS_LABEL_KEY[s])}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 text-muted"
      />
    </div>
  );
}

export default function AdminOrders() {
  const { t, lang } = useLanguage();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useOrders();
  const orders = data?.rows ?? [];

  const [filter, setFilter] = useState<OrderStatus | null>(null);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Partial<Record<OrderStatus, boolean>>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; key: TranslationKey } | null>(null);

  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [toDelete, setToDelete] = useState<Order | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const searched = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return orders;
    const digits = q.replace(/\D/g, "");
    return orders.filter(
      (o) =>
        norm(o.order_number).includes(q) ||
        norm(o.customer_name).includes(q) ||
        norm(o.wilaya).includes(q) ||
        norm(o.city).includes(q) ||
        (digits.length >= 3 && o.customer_phone.replace(/\D/g, "").includes(digits))
    );
  }, [orders, query]);

  const byStatus = useMemo(() => {
    const groups = Object.fromEntries(ORDER_STATUSES.map((s) => [s, [] as Order[]])) as Record<
      OrderStatus,
      Order[]
    >;
    for (const o of searched) groups[o.status]?.push(o);
    return groups;
  }, [searched]);

  // Board tiles summarise everything (search narrows the sections only).
  const board = useMemo(
    () =>
      ORDER_STATUSES.map((s) => {
        const list = orders.filter((o) => o.status === s);
        return { status: s, count: list.length, money: list.reduce((a, o) => a + o.total, 0) };
      }),
    [orders]
  );

  // No filter: hide empty sections. With a filter: show it even when empty,
  // so the tap still answers "nothing here".
  const visible = ORDER_STATUSES.filter((s) => (filter ? s === filter : byStatus[s].length > 0));

  async function changeStatus(order: Order, status: OrderStatus) {
    if (status === order.status) return;
    setBusyId(order.id);
    setNotice(null);
    const err = await updateOrderStatus(queryClient, order.id, status);
    setBusyId(null);
    setNotice(err ? { tone: "error", key: err } : { tone: "ok", key: "admin_order_status_saved" });
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteError(null);
    const err = await deleteOrder(queryClient, toDelete.id);
    setDeleting(false);
    if (err) {
      setDeleteError(t(err));
      return;
    }
    setToDelete(null);
    setNotice({ tone: "ok", key: "admin_order_deleted" });
  }

  async function handleDeleteAll() {
    setDeletingAll(true);
    setNotice(null);
    const { error } = await supabase.from("orders").delete().not("id", "is", null);
    setDeletingAll(false);
    setDeleteAllOpen(false);
    if (error) {
      setNotice({ tone: "error", key: "admin_delete_error" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["orders"] });
  }

  async function exportList(list: Order[], suffix = "") {
    setNotice(null);
    try {
      await exportOrdersToExcel(list, suffix);
    } catch {
      setNotice({ tone: "error", key: "admin_export_error" });
    }
  }

  const deleteButton = (order: Order) => (
    <button
      type="button"
      onClick={() => {
        setDeleteError(null);
        setToDelete(order);
      }}
      className="rounded-lg p-2 text-muted transition-colors hover:bg-red-500/10 hover:text-red-500"
      aria-label={`${t("admin_order_delete")} ${order.order_number}`}
      title={t("admin_order_delete")}
    >
      <Trash2 size={16} />
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">
            {t("admin_orders_title")}
          </h1>
          <p className="mt-1 text-sm text-muted">{t("admin_orders_intro")}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={orders.length === 0}
            onClick={() => exportList(orders)}
          >
            <Download size={16} />
            {t("admin_export_orders")}
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            disabled={orders.length === 0}
            onClick={() => setDeleteAllOpen(true)}
          >
            <Trash2 size={16} />
            {t("admin_delete_all_orders")}
          </Button>
        </div>
      </div>

      {/* Board rail: one tile per pipeline stage. */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 xl:grid-cols-5">
        {board.map((tile) => {
          const active = filter === tile.status;
          return (
            <button
              key={tile.status}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(active ? null : tile.status)}
              className={cn(
                "group rounded-2xl border bg-panel p-3 text-start shadow-card transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand sm:p-4",
                active ? "border-brand ring-1 ring-brand/40" : "border-line hover:border-brand/40"
              )}
            >
              <span className="flex items-center gap-2 text-xs font-semibold text-muted">
                <span
                  className={cn("h-2 w-2 shrink-0 rounded-full", ORDER_STATUS_DOT[tile.status])}
                />
                <span className="truncate">{t(ORDER_STATUS_LABEL_KEY[tile.status])}</span>
              </span>
              <span className="mt-2 block font-heading text-2xl font-extrabold text-ink">
                {tile.count}
              </span>
              <Price value={tile.money} className="block truncate text-xs text-muted" />
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-muted"
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("admin_orders_search")}
            aria-label={t("admin_orders_search")}
            className="ps-10"
          />
        </div>
        {filter && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setFilter(null)}>
            {t("admin_order_filter_all")}
          </Button>
        )}
      </div>

      {data?.capped && (
        <p className="flex items-start gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm text-amber-500">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" />
          {t("admin_orders_capped")}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className={cn(
            "rounded-xl px-3 py-2 text-sm",
            notice.tone === "ok" ? "bg-accent/10 text-accent" : "bg-red-500/10 text-red-500"
          )}
        >
          {t(notice.key)}
        </p>
      )}

      {isLoading && <p className="text-muted">{t("loading")}</p>}
      {isError && <p className="text-red-500">{t("admin_load_error")}</p>}
      {!isLoading && !isError && orders.length === 0 && (
        <BentoPanel className="p-8 text-center text-sm text-muted">
          {t("admin_orders_none")}
        </BentoPanel>
      )}
      {!isLoading && orders.length > 0 && visible.length === 0 && (
        <BentoPanel className="p-8 text-center text-sm text-muted">
          {t("admin_orders_no_match")}
        </BentoPanel>
      )}

      {visible.map((status) => {
        const list = byStatus[status];
        const open = !collapsed[status];
        const sum = list.reduce((a, o) => a + o.total, 0);
        return (
          <section key={status} className="rounded-2xl border border-line bg-panel shadow-card">
            <div className="flex items-center gap-2 p-3 sm:p-4">
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setCollapsed((c) => ({ ...c, [status]: open }))}
                className="flex min-w-0 flex-1 items-center gap-2.5 text-start"
              >
                <ChevronDown
                  size={18}
                  className={cn(
                    "shrink-0 text-muted transition-transform",
                    !open && "-rotate-90 rtl:rotate-90"
                  )}
                />
                <span
                  className={cn("h-2.5 w-2.5 shrink-0 rounded-full", ORDER_STATUS_DOT[status])}
                />
                <span className="truncate font-heading text-base font-bold text-ink">
                  {t(ORDER_STATUS_LABEL_KEY[status])}
                </span>
                <span className="rounded-full bg-panel-2 px-2 py-0.5 text-xs font-bold text-muted">
                  {list.length}
                </span>
                <Price value={sum} className="hidden text-sm text-muted sm:inline" />
              </button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={list.length === 0}
                onClick={() => exportList(list, status)}
                aria-label={`${t("admin_export_orders")} — ${t(ORDER_STATUS_LABEL_KEY[status])}`}
              >
                <Download size={15} />
                <span className="hidden sm:inline">Excel</span>
              </Button>
            </div>

            {open && list.length === 0 && (
              <p className="border-t border-line px-4 py-6 text-center text-sm text-muted">
                {t("admin_orders_empty_status")}
              </p>
            )}

            {open && list.length > 0 && (
              <>
                {/* Phones: cards. A 7-column table at 360 px drags the page sideways. */}
                <ul className="divide-y divide-line border-t border-line md:hidden">
                  {list.map((order) => (
                    <li key={order.id} className="space-y-2.5 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link
                            to={`/admin/orders/${order.id}`}
                            dir="ltr"
                            className="block truncate font-mono text-sm font-semibold text-brand hover:underline"
                          >
                            {order.order_number}
                          </Link>
                          <p className="truncate text-sm font-semibold text-ink" dir="auto">
                            {order.customer_name}
                          </p>
                          <p className="truncate text-xs text-muted">
                            <bdi dir="ltr">{order.customer_phone}</bdi> · {order.wilaya}
                          </p>
                        </div>
                        <div className="shrink-0 text-end">
                          <Price value={order.total} className="block text-sm font-bold text-ink" />
                          <span className="text-xs text-muted">
                            {formatDate(order.created_at, lang)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusPicker
                          order={order}
                          busy={busyId === order.id}
                          onChange={(s) => changeStatus(order, s)}
                        />
                        {deleteButton(order)}
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="relative hidden overflow-x-auto border-t border-line md:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line text-xs text-muted">
                        <th className="whitespace-nowrap px-4 py-2.5 text-start font-semibold">
                          {t("admin_order_number")}
                        </th>
                        <th className="whitespace-nowrap px-4 py-2.5 text-start font-semibold">
                          {t("admin_order_customer")}
                        </th>
                        <th className="whitespace-nowrap px-4 py-2.5 text-start font-semibold">
                          {t("admin_order_wilaya")}
                        </th>
                        <th className="whitespace-nowrap px-4 py-2.5 text-start font-semibold">
                          {t("admin_order_total")}
                        </th>
                        <th className="whitespace-nowrap px-4 py-2.5 text-start font-semibold">
                          {t("admin_order_status")}
                        </th>
                        <th className="hidden whitespace-nowrap px-4 py-2.5 text-start font-semibold lg:table-cell">
                          {t("admin_order_date")}
                        </th>
                        <th className="px-4 py-2.5 text-end font-semibold">
                          <span className="sr-only">{t("admin_actions")}</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((order) => (
                        <tr
                          key={order.id}
                          className="border-b border-line last:border-0 hover:bg-panel-2/40"
                        >
                          <td className="whitespace-nowrap px-4 py-2.5">
                            <Link
                              to={`/admin/orders/${order.id}`}
                              dir="ltr"
                              className="font-mono text-brand hover:underline"
                            >
                              {order.order_number}
                            </Link>
                          </td>
                          <td className="max-w-[14rem] px-4 py-2.5">
                            <p className="truncate font-medium text-ink" dir="auto">
                              {order.customer_name}
                            </p>
                            <p className="text-xs text-muted">
                              <bdi dir="ltr">{order.customer_phone}</bdi>
                            </p>
                          </td>
                          <td className="max-w-[12rem] px-4 py-2.5">
                            <p className="truncate">{order.wilaya}</p>
                            <p className="truncate text-xs text-muted">{order.city}</p>
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5 font-semibold">
                            <Price value={order.total} />
                          </td>
                          <td className="px-4 py-2.5">
                            <StatusPicker
                              order={order}
                              busy={busyId === order.id}
                              onChange={(s) => changeStatus(order, s)}
                            />
                          </td>
                          <td className="hidden whitespace-nowrap px-4 py-2.5 text-muted lg:table-cell">
                            {formatDate(order.created_at, lang)}
                          </td>
                          <td className="px-2 py-2.5 text-end">{deleteButton(order)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        );
      })}

      <ConfirmDialog
        open={toDelete !== null}
        title={`${t("admin_order_delete_title")} ${toDelete?.order_number ?? ""}`}
        confirmLabel={t("admin_order_delete")}
        busy={deleting}
        error={deleteError}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      >
        {toDelete && (
          <>
            <p>
              <span className="font-semibold text-ink" dir="auto">
                {toDelete.customer_name}
              </span>{" "}
              · <Price value={toDelete.total} />
            </p>
            <p>{t("admin_order_delete_body")}</p>
            {toDelete.status !== "cancelled" && (
              <p className="text-amber-500">{t("admin_order_delete_stock_note")}</p>
            )}
          </>
        )}
      </ConfirmDialog>

      <DeleteAllOrdersModal
        open={deleteAllOpen}
        count={orders.length}
        deleting={deletingAll}
        onClose={() => setDeleteAllOpen(false)}
        onDownload={() => exportList(orders)}
        onConfirm={handleDeleteAll}
      />
    </div>
  );
}
