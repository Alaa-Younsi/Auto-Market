import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useActivePixels } from "@/hooks/useTrackingPixels";
import { syncTrackingPage } from "@/lib/tracking";

/**
 * Keeps the live pixel set in step with the route: on every navigation (and
 * once the pixel list arrives) it re-matches pixels to the page and sends
 * PageView to each matched pixel once per path. Skips /admin entirely.
 */
export function TrackingSync() {
  const { pathname } = useLocation();
  const { data: pixels, isFetched } = useActivePixels();

  useEffect(() => {
    // Wait for the list to settle (loaded, or failed → no pixels). Syncing on
    // the empty placeholder would flush queued events to nobody.
    if (!isFetched) return;
    syncTrackingPage(pixels ?? [], pathname);
  }, [pixels, isFetched, pathname]);

  return null;
}
