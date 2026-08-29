import * as XLSX from "xlsx";
import { formatDate } from "@/lib/format";
import type { Order } from "@/types/db";

/**
 * Excel/Sheets formula injection guard. `customer_name`, `wilaya`, `city`,
 * `address` and `notes` are free-text checkout input — the RPC validates their
 * length/shape but never restricts the character set, so a customer named
 * `=cmd|'/c calc'!A1` executes for whoever opens the export. Prefixing a
 * leading `= + - @` (or tab/CR) with a single quote makes Excel/Sheets render
 * it as literal text, with no visible change to the value.
 */
function excelSafe(value: unknown): unknown {
  if (typeof value !== "string") return value;
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

export function exportOrdersToExcel(orders: Order[]): void {
  const rows = orders.map((order) => ({
    "N° Commande": order.order_number,
    Client: excelSafe(order.customer_name),
    Téléphone: excelSafe(order.customer_phone),
    Wilaya: excelSafe(order.wilaya),
    Ville: excelSafe(order.city),
    Adresse: excelSafe(order.address ?? ""),
    Statut: order.status,
    "Type de livraison": order.delivery_type,
    "Sous-total": order.subtotal,
    Livraison: order.shipping,
    Remise: order.discount,
    Total: order.total,
    Notes: excelSafe(order.notes ?? ""),
    Date: formatDate(order.created_at, "fr"),
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Commandes");

  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `commandes-${today}.xlsx`);
}
