import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ConsentStatus = "unset" | "accepted" | "refused" | "custom";

interface ConsentState {
  status: ConsentStatus;
  /** Advertising measurement (Meta / TikTok pixels). Off until the visitor says yes. */
  ads: boolean;
  /** The banner is open (first visit, or reopened from "Gérer les cookies"). */
  panelOpen: boolean;
  acceptAll: () => void;
  refuseAll: () => void;
  save: (ads: boolean) => void;
  openPanel: () => void;
  closePanel: () => void;
}

/**
 * Cookie / tracker consent (loi 18-07 on personal data). Only the choice is
 * persisted — never `panelOpen`. Revoking after the pixels have loaded
 * reloads the page: a loaded vendor script cannot be "un-run".
 */
export const useConsentStore = create<ConsentState>()(
  persist(
    (set, get) => {
      const decide = (status: ConsentStatus, ads: boolean) => {
        const hadAds = get().ads;
        set({ status, ads, panelOpen: false });
        if (hadAds && !ads) window.location.reload();
      };
      return {
        status: "unset",
        ads: false,
        panelOpen: false,
        acceptAll: () => decide("accepted", true),
        refuseAll: () => decide("refused", false),
        save: (ads) => decide("custom", ads),
        openPanel: () => set({ panelOpen: true }),
        closePanel: () => set({ panelOpen: false }),
      };
    },
    {
      name: "auto-market-consent",
      version: 1,
      partialize: (s) => ({ status: s.status, ads: s.ads }),
    }
  )
);
