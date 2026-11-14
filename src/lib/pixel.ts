declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/** Set VITE_META_PIXEL_ID in Vercel (Project → Settings → Environment Variables). */
const PIXEL_ID = (import.meta.env.VITE_META_PIXEL_ID as string | undefined)?.trim() ?? "";

/**
 * Loads Meta's pixel ONLY when a real id is configured. The base snippet used
 * to sit inline in index.html with a literal "YOUR_PIXEL_ID", so every visit
 * initialised a bogus pixel. Loading it from here also keeps it out of the
 * CSP's inline-script hashes. Any failure (ad blocker, offline) is a silent
 * no-op: tracking must never break the shop.
 */
export function initPixel(): void {
  if (!/^\d{10,20}$/.test(PIXEL_ID) || window.fbq) return;
  type Fbq = ((...args: unknown[]) => void) & {
    callMethod?: (...args: unknown[]) => void;
    queue: unknown[][];
    push: Fbq;
    loaded: boolean;
    version: string;
  };
  const fbq = function (this: unknown, ...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue.push(args);
  } as Fbq;
  fbq.queue = [];
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  window.fbq = fbq;
  (window as Window & { _fbq?: Fbq })._fbq = fbq;

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);

  fbq("init", PIXEL_ID);
  // The router's PageView tracker skips the first render; this is that one.
  if (!window.location.pathname.startsWith("/admin")) fbq("track", "PageView");
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
