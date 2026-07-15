import * as XLSX from "xlsx";
import { formatDate } from "@/lib/format";
import type { Order } from "@/types/db";

export function exportOrdersToExcel(orders: Order[]): void {
  const rows = orders.map((order) => ({
    "N° Commande": order.order_number,
    Client: order.customer_name,
    Téléphone: order.customer_phone,
    Wilaya: order.wilaya,
    Ville: order.city,
    Adresse: order.address ?? "",
    Statut: order.status,
    "Type de livraison": order.delivery_type,
    "Sous-total": order.subtotal,
    Livraison: order.shipping,
    Remise: order.discount,
    Total: order.total,
    Notes: order.notes ?? "",
    Date: formatDate(order.created_at, "fr"),
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Commandes");

  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `commandes-${today}.xlsx`);
}
