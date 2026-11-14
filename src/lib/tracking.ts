/**
 * Multi-pixel tracking runtime (Meta + TikTok), driven by the
 * `tracking_pixels` table that the owner edits in /admin/pixels.
 *
 * Rules that shape everything here:
 *  - Every event goes to ONE pixel at a time (Meta `trackSingle`, TikTok
 *    `ttq.instance(id)`). Plain `fbq("track")` broadcasts to every initialised
 *    pixel and files one campaign's conversions under another's.
 *  - Which pixels are live is decided from the DB by scope + match values.
 *  - Nothing here may throw or block: an ad blocker is the normal case for a
 *    real share of visitors and must never break the shop.
 *  - The vendor loaders are installed from JS, not inline <script> snippets,
 *    so the site CSP needs no 'unsafe-inline'.
 */
import type { TrackingEventKey, TrackingPixel } from "@/types/db";

type Fn = (...args: unknown[]) => void;
type FbqStub = Fn & {
  callMethod?: Fn;
  queue: unknown[][];
  push: FbqStub;
  loaded: boolean;
  version: string;
};
type TtqInstance = Record<string, Fn>;
type TtqStub = unknown[] & {
  methods: string[];
  setAndDefer: (target: Record<string, Fn>, method: string) => void;
  instance: (id: string) => TtqInstance;
  load: (id: string) => void;
  _i?: Record<string, unknown[] & { _u?: string }>;
  _t?: Record<string, number>;
  _o?: Record<string, unknown>;
} & Record<string, Fn>;

declare global {
  interface Window {
    fbq?: FbqStub;
    _fbq?: FbqStub;
    ttq?: TtqStub;
    TiktokAnalyticsObject?: string;
  }
}

const CURRENCY = "DZD";

/* ------------------------------------------------------------------ *
 * Vendor loaders (each installed once, on first use of that provider)
 * ------------------------------------------------------------------ */

function ensureFbq(): FbqStub | null {
  if (typeof window === "undefined") return null;
  if (window.fbq) return window.fbq;
  const fbq = ((...args: unknown[]) => {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue.push(args);
  }) as FbqStub;
  fbq.queue = [];
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  window.fbq = fbq;
  window._fbq = fbq;
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(s);
  return fbq;
}

/** TikTok's base code, ported from the vendor snippet. */
function ensureTtq(): TtqStub | null {
  if (typeof window === "undefined") return null;
  if (window.ttq) return window.ttq;
  window.TiktokAnalyticsObject = "ttq";
  const ttq = [] as unknown as TtqStub;
  ttq.methods = [
    "page",
    "track",
    "identify",
    "instances",
    "debug",
    "on",
    "off",
    "once",
    "ready",
    "alias",
    "group",
    "enableCookie",
    "disableCookie",
    "holdConsent",
    "revokeConsent",
    "grantConsent",
  ];
  ttq.setAndDefer = (target, method) => {
    target[method] = (...args: unknown[]) => {
      (target as unknown as unknown[]).push([method, ...args]);
    };
  };
  for (const m of ttq.methods) ttq.setAndDefer(ttq, m);
  ttq.instance = (id: string) => {
    const inst = (ttq._i?.[id] ?? []) as unknown as TtqInstance;
    for (const m of ttq.methods) ttq.setAndDefer(inst, m);
    return inst;
  };
  ttq.load = (id: string) => {
    const src = "https://analytics.tiktok.com/i18n/pixel/events.js";
    ttq._i = ttq._i ?? {};
    ttq._i[id] = [] as unknown[] & { _u?: string };
    ttq._i[id]._u = src;
    ttq._t = ttq._t ?? {};
    ttq._t[id] = Date.now();
    ttq._o = ttq._o ?? {};
    ttq._o[id] = {};
    const s = document.createElement("script");
    s.type = "text/javascript";
    s.async = true;
    s.src = `${src}?sdkid=${id}&lib=ttq`;
    document.head.appendChild(s);
  };
  window.ttq = ttq;
  return ttq;
}

/* ------------------------------------------------------------------ *
 * Targeting
 * ------------------------------------------------------------------ */

export interface PageContext {
  pathname: string;
}

function productSlugOf(pathname: string): string | null {
  const m = pathname.match(/^\/product\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

/** Empty match_values on a scoped pixel = "every page of that kind". */
export function matchPixels(pixels: TrackingPixel[], ctx: PageContext): TrackingPixel[] {
  const slug = productSlugOf(ctx.pathname);
  return pixels.filter((p) => {
    if (!p.active) return false;
    const values = (p.match_values ?? []).map((v) => v.trim()).filter(Boolean);
    switch (p.scope) {
      case "all":
        return true;
      case "paths":
        return values.length === 0 || values.some((v) => ctx.pathname.startsWith(v));
      case "products":
        return slug !== null && (values.length === 0 || values.includes(slug));
      default:
        return false;
    }
  });
}

/* ------------------------------------------------------------------ *
 * State + dispatch
 * ------------------------------------------------------------------ */

const initialised = new Set<string>();
let livePixels: TrackingPixel[] = [];
/**
 * Ad traffic lands straight on a product page, where ViewContent fires as soon
 * as the product loads — often BEFORE the pixel list has arrived from the DB.
 * Until the first real sync, events wait here instead of being dropped.
 */
let synced = false;
const pending: Array<[Exclude<TrackingEventKey, "page_view">, TrackPayload]> = [];
const MAX_PENDING = 20;
let pageViews: { path: string; ids: Set<string> } = { path: "", ids: new Set() };

const key = (p: TrackingPixel) => `${p.provider}:${p.pixel_id}`;
const wants = (p: TrackingPixel, e: TrackingEventKey) => p.events?.[e] !== false;

function initPixel(p: TrackingPixel) {
  if (initialised.has(key(p))) return;
  try {
    if (p.provider === "meta") {
      const fbq = ensureFbq();
      if (!fbq) return;
      // The pixel's own automatic PageView ignores our per-pixel toggles.
      fbq("set", "autoConfig", false, p.pixel_id);
      fbq("init", p.pixel_id);
    } else {
      const ttq = ensureTtq();
      if (!ttq) return;
      ttq.load(p.pixel_id);
    }
    initialised.add(key(p));
  } catch {
    // tracking must never break the page
  }
}

/**
 * Called on every storefront route change (and when the pixel list loads):
 * picks the pixels for this page, initialises new ones, and sends PageView to
 * each matched pixel at most once per path.
 */
export function syncTrackingPage(pixels: TrackingPixel[], pathname: string): void {
  if (pathname.startsWith("/admin")) {
    // Staff clicking around their own dashboard is not ad traffic.
    livePixels = [];
    synced = true;
    pending.length = 0;
    return;
  }
  livePixels = matchPixels(pixels, { pathname });
  if (pageViews.path !== pathname) pageViews = { path: pathname, ids: new Set() };
  for (const p of livePixels) {
    initPixel(p);
    if (!initialised.has(key(p)) || pageViews.ids.has(key(p))) continue;
    pageViews.ids.add(key(p));
    if (!wants(p, "page_view")) continue;
    try {
      if (p.provider === "meta") window.fbq?.("trackSingle", p.pixel_id, "PageView");
      else window.ttq?.instance(p.pixel_id).page();
    } catch {
      // ignore
    }
  }
  if (!synced) {
    synced = true;
    for (const [event, payload] of pending.splice(0)) trackEvent(event, payload);
  }
}

export interface TrackPayload {
  contentIds?: string[];
  value?: number;
  /** Purchase: order number, also the dedup event id. */
  orderId?: string;
}

const META_EVENT: Record<Exclude<TrackingEventKey, "page_view">, string> = {
  view_content: "ViewContent",
  add_to_cart: "AddToCart",
  initiate_checkout: "InitiateCheckout",
  purchase: "Purchase",
};
const TIKTOK_EVENT: Record<Exclude<TrackingEventKey, "page_view">, string> = {
  view_content: "ViewContent",
  add_to_cart: "AddToCart",
  initiate_checkout: "InitiateCheckout",
  purchase: "CompletePayment",
};

/** A missing/NaN/0 value would still reach the ad platform as a "conversion". */
function validValue(payload: TrackPayload): boolean {
  if (payload.value === undefined) return true;
  return Number.isFinite(payload.value) && payload.value > 0;
}

export function trackEvent(
  event: Exclude<TrackingEventKey, "page_view">,
  payload: TrackPayload
): void {
  if (!validValue(payload)) return;
  if (!synced) {
    if (pending.length < MAX_PENDING) pending.push([event, payload]);
    return;
  }
  const ids = payload.contentIds ?? [];
  for (const p of livePixels) {
    if (!initialised.has(key(p)) || !wants(p, event)) continue;
    try {
      if (p.provider === "meta") {
        window.fbq?.(
          "trackSingle",
          p.pixel_id,
          META_EVENT[event],
          {
            content_ids: ids,
            content_type: "product",
            value: payload.value,
            currency: CURRENCY,
            ...(payload.orderId ? { order_id: payload.orderId } : {}),
          },
          payload.orderId ? { eventID: payload.orderId } : undefined
        );
      } else {
        window.ttq?.instance(p.pixel_id).track(
          TIKTOK_EVENT[event],
          {
            contents: ids.map((id) => ({ content_id: id, content_type: "product" })),
            value: payload.value,
            currency: CURRENCY,
          },
          payload.orderId ? { event_id: payload.orderId } : undefined
        );
      }
    } catch {
      // ignore
    }
  }
}
