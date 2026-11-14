/**
 * Commerce events, called from the storefront. They go to whichever pixels
 * the owner configured in /admin/pixels for the current page (see
 * lib/tracking.ts). PageView is handled by <TrackingSync /> on route change.
 */
import { trackEvent } from "@/lib/tracking";

export function trackViewContent(productId: string, value: number) {
  trackEvent("view_content", { contentIds: [productId], value });
}

export function trackAddToCart(productId: string, value: number) {
  trackEvent("add_to_cart", { contentIds: [productId], value });
}

export function trackInitiateCheckout(productIds: string | string[], value: number) {
  const contentIds = Array.isArray(productIds) ? productIds : [productIds];
  trackEvent("initiate_checkout", { contentIds, value });
}

export function trackPurchase(orderNumber: string, value: number, contentIds: string[] = []) {
  trackEvent("purchase", { orderId: orderNumber, value, contentIds });
}
