import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Gift, ShoppingBag } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";
import { useMediaFlags } from "@/hooks/useMediaFlags";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/format";
import { Price } from "@/components/ui/Price";
import { offerLabel } from "@/lib/offers";
import { trackAddToCart } from "@/lib/pixel";
import { Badge } from "@/components/ui/Badge";
import { SmartImage } from "@/components/ui/SmartImage";
import { TiltCard } from "@/components/ui/TiltCard";
import type { Product } from "@/types/db";

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { t, lang, dir } = useLanguage();
  const { prefersReducedMotion } = useMediaFlags();
  const addItem = useCartStore((s) => s.addItem);

  const image = product.product_images?.[0]?.url ?? null;
  const name = lang === "ar" ? product.name_ar : product.name_fr;
  const hasDiscount = product.compare_at_price != null && product.compare_at_price > product.price;
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
      offers: product.quantity_offers,
    });
    trackAddToCart(product.id, Number(product.price));
  }

  return (
    <motion.div
      // Position/rotation only — never gate visibility on a whileInView
      // opacity transition: a dropped IntersectionObserver callback would
      // leave the card stuck invisible. Opacity stays at its CSS default of 1.
      initial={
        prefersReducedMotion
          ? false
          : { x: dir === "rtl" ? 56 : -56, rotate: dir === "rtl" ? 2 : -2 }
      }
      whileInView={{ x: 0, rotate: 0 }}
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
          {/* fx-sweep here fires on .group hover: a headlight glare passes
              over the product photo as the card lifts. */}
          <div className="fx-sweep relative aspect-square overflow-hidden bg-panel-2">
            {image ? (
              <div className="h-full w-full transition-transform duration-500 group-hover:scale-110">
                <SmartImage
                  src={image}
                  alt={name}
                  width={800}
                  height={800}
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px"
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted">
                <ShoppingBag size={32} />
              </div>
            )}

            <div className="absolute start-3 top-3 flex flex-col items-start gap-1.5">
              {hasDiscount && (
                <Badge tone="accent" className="bg-accent text-white border-transparent">
                  -{discountPct}%
                </Badge>
              )}
              {product.quantity_offers.length > 0 && (
                <Badge
                  tone="accent"
                  className="flex items-center gap-1 bg-accent text-white border-transparent"
                >
                  <Gift size={11} />
                  {offerLabel(product.quantity_offers[0], lang, formatPrice)}
                </Badge>
              )}
            </div>

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
            <h3 className="mb-2 line-clamp-1 font-heading text-sm font-bold text-ink">{name}</h3>
            <div className="flex items-center gap-2">
              <Price
                value={product.price}
                className="font-heading text-base font-extrabold text-brand"
              />
              {hasDiscount && (
                <Price
                  value={product.compare_at_price as number}
                  className="text-xs text-muted line-through"
                />
              )}
            </div>
          </div>
        </Link>
      </TiltCard>
    </motion.div>
  );
}
