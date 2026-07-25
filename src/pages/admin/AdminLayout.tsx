import { Suspense, useEffect, useState } from "react";
import { Link, Navigate, NavLink, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  LayoutDashboard,
  Languages,
  ListTree,
  LogOut,
  Menu,
  Moon,
  Package,
  Star,
  Sun,
  Truck,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageProvider";
import { useTheme } from "@/theme/ThemeProvider";
import { TachometerLoader } from "@/components/effects/TachometerLoader";
import { BrandMark } from "@/components/ui/BrandMark";
import { cn } from "@/lib/utils";
import type { TranslationKey } from "@/i18n/translations";

interface NavItem {
  to: string;
  labelKey: TranslationKey;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/admin", labelKey: "admin_nav_dashboard", icon: LayoutDashboard },
  { to: "/admin/products", labelKey: "admin_nav_products", icon: Package },
  { to: "/admin/categories", labelKey: "admin_nav_categories", icon: ListTree },
  { to: "/admin/orders", labelKey: "admin_nav_orders", icon: Truck },
  { to: "/admin/delivery-prices", labelKey: "admin_nav_delivery", icon: Truck },
  { to: "/admin/reviews", labelKey: "admin_nav_reviews", icon: Star },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { t, lang, setLang } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { signOut } = useAuth();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-5 py-5">
        <BrandMark className="shadow-none" />
        <span className="font-heading text-base font-extrabold text-ink">
          {t("brand_name")}
        </span>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/admin"}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors",
                isActive ? "bg-brand/10 text-brand" : "text-muted hover:bg-panel-2 hover:text-ink"
              )
            }
          >
            <item.icon size={17} />
            {t(item.labelKey)}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-1 border-t border-line px-3 py-4">
        <Link
          to="/"
          onClick={onNavigate}
          className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-muted transition-colors hover:bg-panel-2 hover:text-ink"
        >
          <ArrowLeft size={17} className="rtl:rotate-180" />
          {t("admin_back_to_site")}
        </Link>
        <button
          onClick={() => setLang(lang === "fr" ? "ar" : "fr")}
          className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-muted transition-colors hover:bg-panel-2 hover:text-ink"
        >
          <Languages size={17} />
          {lang === "fr" ? "العربية" : "Français"}
        </button>
        <button
          onClick={toggleTheme}
          className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-muted transition-colors hover:bg-panel-2 hover:text-ink"
        >
          {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
          {theme === "light" ? t("theme_dark") : t("theme_light")}
        </button>
        <button
          onClick={() => signOut()}
          className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-red-500 transition-colors hover:bg-red-500/10"
        >
          <LogOut size={17} />
          {t("admin_logout")}
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const { session, loading } = useAuth();
  const { dir } = useLanguage();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the drawer whenever the route changes — a nav tap, a redirect, or the
  // browser back button all change the path with no click on the drawer itself.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // While the drawer is open, lock the body with `position: fixed` at the
  // current offset — NOT `overflow: hidden`, which on iOS Safari still lets the
  // visual viewport rubber-band and drags the fixed drawer/backdrop out of sync
  // with where taps land, the classic "drawer opens but the X and backdrop go
  // dead" phone bug. Also close on Escape and when the viewport grows past the
  // `md` breakpoint (where the drawer is hidden and would otherwise strand the
  // scroll-lock on an invisible element).
  useEffect(() => {
    if (!mobileOpen) return;
    const scrollY = window.scrollY;
    const { body } = document;
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    const onResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);

    return () => {
      body.style.position = "";
      body.style.top = "";
      body.style.width = "";
      body.style.overflow = "";
      window.scrollTo(0, scrollY);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [mobileOpen]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted">…</div>;
  }

  if (!session) {
    return <Navigate to="/admin/login" replace />;
  }

  const offscreenX = dir === "rtl" ? "100%" : "-100%";

  return (
    <div className="flex min-h-screen bg-bg">
      <aside className="hidden w-64 shrink-0 border-e border-line bg-panel md:block">
        <SidebarContent />
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="fixed top-0 z-50 h-full w-64 bg-panel shadow-2xl md:hidden"
              style={{ [dir === "rtl" ? "right" : "left"]: 0 }}
              initial={{ x: offscreenX }}
              animate={{ x: 0 }}
              exit={{ x: offscreenX }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
            >
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* min-w-0 is essential: without it this flex column keeps its default
          `min-width: auto` and refuses to shrink below its widest child, so a
          wide `whitespace-nowrap` table stretches the whole column past the
          phone viewport (horizontal overflow) instead of scrolling inside its
          own `overflow-x-auto` panel. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-line bg-panel px-4 py-3 md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="-m-2 p-2 text-ink"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <span className="font-heading text-sm font-extrabold text-ink">Admin</span>
          {mobileOpen && (
            <button
              onClick={() => setMobileOpen(false)}
              className="-m-2 ms-auto p-2 text-ink"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          )}
        </div>
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          {/* Own boundary so navigating between admin sub-pages only
              suspends the content area, not the sidebar shell above. */}
          <Suspense
            fallback={
              <div className="flex min-h-[50vh] items-center justify-center">
                <TachometerLoader />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
