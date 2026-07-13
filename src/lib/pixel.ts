declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/* A value of undefined/NaN/0 would still reach Meta as a "successful" event
   and silently corrupt ROAS reporting — skip the send instead. */
function hasValidValue(params?: Record<string, unknown>): boolean {
  if (!params || !("value" in params)) return true;
  const value = params.value;
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function fire(event: string, params?: Record<string, unknown>) {
  if (!hasValidValue(params)) {
    if (import.meta.env.DEV) {
      console.warn(`[pixel] skipped ${event}: invalid value`, params);
    }
    return;
  }
  window.fbq?.("track", event, params);
}

export function trackPageView() {
  fire("PageView");
}

export function trackViewContent(productId: string, value: number) {
  fire("ViewContent", {
    content_ids: [productId],
    content_type: "product",
    value,
    currency: "DZD",
  });
}

export function trackAddToCart(productId: string, value: number) {
  fire("AddToCart", {
    content_ids: [productId],
    content_type: "product",
    value,
    currency: "DZD",
  });
}

export function trackInitiateCheckout(productId: string, value: number) {
  fire("InitiateCheckout", {
    content_ids: [productId],
    content_type: "product",
    value,
    currency: "DZD",
  });
}

export function trackPurchase(orderNumber: string, value: number) {
  fire("Purchase", {
    order_id: orderNumber,
    value,
    currency: "DZD",
  });
}
