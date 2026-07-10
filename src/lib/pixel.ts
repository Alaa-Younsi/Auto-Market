declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

function fire(event: string, params?: Record<string, unknown>) {
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
