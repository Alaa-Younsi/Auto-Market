import type { TranslationKey } from "@/i18n/translations";

const ERROR_MAP: Record<string, TranslationKey> = {
  ERR_CART_EMPTY: "error_cart_empty",
  ERR_PRODUCT_UNAVAILABLE: "error_product_unavailable",
  ERR_STOCK: "error_stock",
  ERR_WILAYA_DISABLED: "error_wilaya_disabled",
  ERR_INVALID_INPUT: "error_invalid_input",
  ERR_RATE_LIMIT: "error_rate_limit",
};

export function orderErrorKey(message: string | null | undefined): TranslationKey {
  if (!message) return "error_generic";
  const match = Object.keys(ERROR_MAP).find((code) => message.includes(code));
  return match ? ERROR_MAP[match] : "error_generic";
}
