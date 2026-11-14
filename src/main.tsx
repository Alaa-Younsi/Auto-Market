import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// Self-hosted fonts (no Google Fonts round-trip, no third-party CSS in the CSP).
// Sora/Inter: latin subset only. Cairo: the per-weight file carries
// unicode-ranges, so a page only downloads the Arabic or Latin face it uses.
import "@fontsource/sora/latin-400.css";
import "@fontsource/sora/latin-600.css";
import "@fontsource/sora/latin-700.css";
import "@fontsource/sora/latin-800.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "@fontsource/cairo/400.css";
import "@fontsource/cairo/600.css";
import "@fontsource/cairo/700.css";
import "@fontsource/cairo/800.css";
import "./index.css";
import App from "./App.tsx";
import { ErrorBoundary, reloadOnceForNewDeploy } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import { initPixel } from "@/lib/pixel";

// A redeploy while a tab is open deletes the lazy chunks that tab expects.
// Vite reports it here; reload once onto the new build instead of failing.
window.addEventListener("vite:preloadError", (event) => {
  if (reloadOnceForNewDeploy()) event.preventDefault();
});

initPixel();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      // A catalogue does not change while the shopper tabs away; refetching on
      // every focus just burns their data and our Supabase egress.
      refetchOnWindowFocus: false,
    },
  },
});

const root = document.getElementById("root");
if (!root) throw new Error("#root missing from index.html");

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>
);
