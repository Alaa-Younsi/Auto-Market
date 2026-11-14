import type { Schema } from "write-excel-file";
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
function excelSafe(value: string | null | undefined): string {
  const v = value ?? "";
  return /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
}

const SCHEMA: Schema<Order> = [
  { column: "N° Commande", type: String, width: 24, value: (o) => o.order_number },
  { column: "Client", type: String, width: 24, value: (o) => excelSafe(o.customer_name) },
  { column: "Téléphone", type: String, width: 14, value: (o) => excelSafe(o.customer_phone) },
  { column: "Wilaya", type: String, width: 18, value: (o) => excelSafe(o.wilaya) },
  { column: "Ville", type: String, width: 18, value: (o) => excelSafe(o.city) },
  { column: "Adresse", type: String, width: 28, value: (o) => excelSafe(o.address) },
  { column: "Statut", type: String, width: 12, value: (o) => o.status },
  { column: "Type de livraison", type: String, width: 16, value: (o) => o.delivery_type },
  { column: "Sous-total", type: Number, width: 12, value: (o) => Number(o.subtotal) },
  { column: "Livraison", type: Number, width: 11, value: (o) => Number(o.shipping) },
  { column: "Remise", type: Number, width: 10, value: (o) => Number(o.discount) },
  { column: "Total", type: Number, width: 12, value: (o) => Number(o.total) },
  { column: "Notes", type: String, width: 30, value: (o) => excelSafe(o.notes) },
  { column: "Date", type: String, width: 20, value: (o) => formatDate(o.created_at, "fr") },
];

/**
 * Orders → .xlsx download. `write-excel-file` replaces the `xlsx` package
 * (425 KB + unfixed advisories) and is loaded only when the button is pressed.
 */
export async function exportOrdersToExcel(orders: Order[]): Promise<void> {
  const { default: writeXlsxFile } = await import("write-excel-file");
  const today = new Date().toISOString().slice(0, 10);
  await writeXlsxFile(orders, { schema: SCHEMA, fileName: `commandes-${today}.xlsx` });
}
