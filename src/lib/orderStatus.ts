import type { OrderStatus } from "@/types/db";
import type { TranslationKey } from "@/i18n/translations";

export const ORDER_STATUS_LABEL_KEY: Record<OrderStatus, TranslationKey> = {
  pending: "track_status_pending",
  confirmed: "track_status_confirmed",
  shipped: "track_status_shipped",
  delivered: "track_status_delivered",
  cancelled: "track_status_cancelled",
};
