import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";
import { useMediaFlags } from "@/hooks/useMediaFlags";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/format";
import { trackAddToCart } from "@/lib/pixel";
import { Badge } from "@/components/ui/Badge";
import { TiltCard } from "@/components/ui/TiltCard";
import type { Product } from "@/types/db";

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { t, lang, dir } = useLanguage();
  const { prefersReducedMotion } = useMediaFlags();
  const addItem = useCartStore((s) => s.addItem);

  const image = product.product_images?.[0]?.url ?? null;
  const name = lang === "ar" ? product.name_ar : product.name_fr;
  const hasDiscount =
    product.compare_at_price != null && product.compare_at_price > product.price;
  const discountPct = hasDiscount
    ? Math.round(100 - (product.price / (product.compare_at_price as number)) * 100)
    : 0;

  function quickAdd(e: React.MouseEvent) {
    e.preventDefault();
    addItem({
      productId: product.id,
      slug: product.slug,
      nameFr: product.name_fr,
      nameAr: product.name_ar,
      price: product.price,
      quantity: 1,
      imageUrl: image,
      stock: product.stock,
    });
    trackAddToCart(product.id, product.price);
  }

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { x: dir === "rtl" ? 56 : -56, rotate: dir === "rtl" ? 2 : -2, opacity: 0 }}
      whileInView={{ x: 0, rotate: 0, opacity: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{
        type: "spring",
        stiffness: 90,
        damping: 15,
        mass: 0.9,
        delay: Math.min(index, 5) * 0.06,
      }}
    >
      <TiltCard>
        <Link
          to={`/product/${product.slug}`}
          className="fx-lift group block overflow-hidden rounded-2xl border border-line bg-panel"
        >
          <div className="relative aspect-square overflow-hidden bg-panel-2">
            {image ? (
              <img
                src={image}
                alt={name}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted">
                <ShoppingBag size={32} />
              </div>
            )}

            {hasDiscount && (
              <Badge tone="accent" className="absolute start-3 top-3 bg-accent text-white border-transparent">
                -{discountPct}%
              </Badge>
            )}

            <button
              onClick={quickAdd}
              disabled={product.stock === 0}
              className="fx-sweep absolute bottom-3 end-3 flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-2 text-xs font-bold text-white opacity-0 shadow-glow transition-all duration-300 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-0"
            >
              <ShoppingBag size={14} />
              {t("product_add_to_cart")}
            </button>
          </div>

          <div className="p-4">
            {product.category && (
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-brand">
                {lang === "ar" ? product.category.name_ar : product.category.name_fr}
              </p>
            )}
            <h3 className="mb-2 line-clamp-1 font-heading text-sm font-bold text-ink">
              {name}
            </h3>
            <div className="flex items-center gap-2">
              <span className="font-heading text-base font-extrabold text-brand">
                {formatPrice(product.price)}
              </span>
              {hasDiscount && (
                <span className="text-xs text-muted line-through">
                  {formatPrice(product.compare_at_price as number)}
                </span>
              )}
            </div>
          </div>
        </Link>
      </TiltCard>
    </motion.div>
  );
}
