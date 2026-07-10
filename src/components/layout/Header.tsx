import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Moon, Search, ShoppingBag, Sun, X } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";
import { useTheme } from "@/theme/ThemeProvider";
import { useCartStore } from "@/store/cart";
import { ScrollProgress } from "@/components/effects/ScrollProgress";
import { cn } from "@/lib/utils";

export function Header() {
  const { t, lang, setLang } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const open = useCartStore((s) => s.open);
  const totalQuantity = useCartStore((s) => s.totalQuantity());
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { to: "/", label: t("nav_home") },
    { to: "/shop", label: t("nav_shop") },
    { to: "/track-order", label: t("nav_track_order") },
  ];

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate(`/shop?q=${encodeURIComponent(searchValue)}`);
    setMobileOpen(false);
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b border-line backdrop-blur-lg transition-[background-color,box-shadow] duration-300",
        scrolled ? "bg-panel/95 shadow-card" : "bg-panel/85"
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white font-heading font-extrabold shadow-glow">
            A
          </span>
          <span className="font-heading text-lg font-extrabold text-ink">
            {t("brand_name")}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) =>
                cn(
                  "relative rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors",
                  isActive ? "text-brand" : "text-muted hover:bg-panel-2 hover:text-ink"
                )
              }
            >
              {({ isActive }) => (
                <>
                  {link.label}
                  {isActive && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-brand to-accent"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <form onSubmit={submitSearch} className="relative ms-auto hidden max-w-xs flex-1 md:block">
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder={t("nav_search_placeholder")}
            className="w-full rounded-full border border-line bg-panel-2 py-2 ps-10 pe-4 text-sm outline-none transition-colors focus:border-brand focus:bg-panel"
          />
          <Search size={16} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-muted" />
        </form>

        <div className="ms-auto flex items-center gap-1.5 md:ms-0">
          <button
            onClick={() => setLang(lang === "fr" ? "ar" : "fr")}
            className="rounded-lg px-2.5 py-2 text-xs font-bold text-muted transition-colors hover:bg-panel-2 hover:text-ink"
            aria-label="Toggle language"
          >
            {lang === "fr" ? "AR" : "FR"}
          </button>
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 text-muted transition-colors hover:bg-panel-2 hover:text-ink"
            aria-label="Toggle theme"
          >
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button
            onClick={open}
            className="relative rounded-lg p-2 text-muted transition-colors hover:bg-panel-2 hover:text-ink"
            aria-label={t("nav_cart")}
          >
            <ShoppingBag size={18} />
            <AnimatePresence>
              {totalQuantity > 0 && (
                <motion.span
                  // Re-keying on the count replays the pop on every add.
                  key={totalQuantity}
                  initial={{ scale: 0.4 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 18 }}
                  className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white shadow-glow-green"
                >
                  {totalQuantity}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="rounded-lg p-2 text-muted transition-colors hover:bg-panel-2 hover:text-ink md:hidden"
            aria-label="Menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-line md:hidden"
          >
            <div className="flex flex-col gap-1 px-4 py-3">
              <form onSubmit={submitSearch} className="relative mb-2">
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder={t("nav_search_placeholder")}
                  className="w-full rounded-full border border-line bg-panel-2 py-2 ps-10 pe-4 text-sm outline-none"
                />
                <Search size={16} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-muted" />
              </form>
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === "/"}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "rounded-lg px-3.5 py-2.5 text-sm font-semibold",
                      isActive ? "bg-brand/10 text-brand" : "text-ink"
                    )
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ScrollProgress />
    </header>
  );
}
