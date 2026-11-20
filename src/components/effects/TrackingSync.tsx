import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useActivePixels } from "@/hooks/useTrackingPixels";
import { syncTrackingPage } from "@/lib/tracking";
import { useConsentStore } from "@/store/consent";

/**
 * Keeps the live pixel set in step with the route: on every navigation (and
 * once the pixel list arrives) it re-matches pixels to the page and sends
 * PageView to each matched pixel once per path. Skips /admin entirely.
 *
 * No vendor script loads before the visitor accepts advertising cookies:
 * until then the pixel list is empty and events wait in the bounded queue.
 */
export function TrackingSync() {
  const { pathname } = useLocation();
  const adsAllowed = useConsentStore((s) => s.ads);
  const { data: pixels, isFetched } = useActivePixels();

  useEffect(() => {
    // Wait for consent AND for the list to settle (loaded, or failed → no
    // pixels). Syncing on the empty placeholder would flush queued events to nobody.
    if (!adsAllowed || !isFetched) return;
    syncTrackingPage(pixels ?? [], pathname);
  }, [pixels, isFetched, pathname, adsAllowed]);

  return null;
}
