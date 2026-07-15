import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { AnimatePresence, animate, motion } from "framer-motion";
import { Check, Gift, Minus, Plus, ShoppingBag } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";
import { useProduct, useProducts } from "@/hooks/useProducts";
import { useCartStore } from "@/store/cart";
import { useMediaFlags } from "@/hooks/useMediaFlags";
import { useSeo } from "@/hooks/useSeo";
import { formatPrice } from "@/lib/format";
import { lineDiscount, offerLabel } from "@/lib/offers";
import { trackAddToCart, trackViewContent } from "@/lib/pixel";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TiltCard } from "@/components/ui/TiltCard";
import { ProductCard } from "@/components/product/ProductCard";
import { InlineCheckout } from "@/components/product/InlineCheckout";
import { ProductVideo } from "@/components/product/ProductVideo";
import type { SelectedVariant } from "@/types/db";

export default function Product() {
  const { slug } = useParams<{ slug: string }>();
  const { t, lang } = useLanguage();
  const { data: product, isLoading } = useProduct(slug);
  const { data: related = [] } = useProducts({
    categoryId: product?.category_id ?? undefined,
  });
  const addItem = useCartStore((s) => s.addItem);
  const { prefersReducedMotion } = useMediaFlags();

  const [activeImage, setActiveImage] = useState(0);
  const [color, setColor] = useState<string | undefined>();
  const [size, setSize] = useState<string | undefined>();
  const [variantChoices, setVariantChoices] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [displayPrice, setDisplayPrice] = useState<number | null>(null);
  const [added, setAdded] = useState(false);

  const trackedId = useRef<string | null>(null);
  const addedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkoutRef = useRef<HTMLDivElement | null>(null);

  // The price reads as "arriving" rather than "counting up from zero" — it
  // starts close to the real value, never at a number that could be
  // mistaken for the actual price.
  useEffect(() => {
    if (!product) return;
    if (prefersReducedMotion) {
      setDisplayPrice(product.price);
      return;
    }
    const controls = animate(product.price * 0.85, product.price, {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: setDisplayPrice,
    });
    return () => controls.stop();
  }, [product, prefersReducedMotion]);

  useEffect(() => {
    return () => {
      if (addedTimeout.current) clearTimeout(addedTimeout.current);
    };
  }, []);

  const seoName = product ? (lang === "ar" ? product.name_ar : product.name_fr) : null;
  const seoImage = product?.product_images?.[0]?.url;
  const seoDescription = product
    ? (lang === "ar" ? product.description_ar : product.description_fr) ?? undefined
    : undefined;

  useSeo({
    title: seoName ? `${seoName} — ${t("brand_name")}` : t("brand_name"),
    description: seoDescription,
    image: seoImage,
    jsonLd: product
      ? {
          "@context": "https://schema.org",
          "@type": "Product",
          name: seoName,
          description: seoDescription,
          image: product.product_images?.map((img) => img.url) ?? [],
          sku: product.style_code ?? product.slug,
          brand: { "@type": "Brand", name: t("brand_name") },
          offers: {
            "@type": "Offer",
            url: `https://automarket.dz/product/${product.slug}`,
            priceCurrency: "DZD",
            price: Number(product.price),
            availability:
              product.stock > 0
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
          },
        }
      : undefined,
  });

  useEffect(() => {
    if (!product || trackedId.current === product.id) return;
    trackedId.current = product.id;
    trackViewContent(product.id, Number(product.price));
  }, [product]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <div className="fx-shimmer aspect-square rounded-2xl" />
          <div className="space-y-4">
            <div className="fx-shimmer h-8 w-2/3 rounded-lg" />
            <div className="fx-shimmer h-5 w-1/3 rounded-lg" />
            <div className="fx-shimmer h-24 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <p className="text-muted">{t("not_found_message")}</p>
      </div>
    );
  }

  const images = product.product_images ?? [];
  const name = lang === "ar" ? product.name_ar : product.name_fr;
  const description = lang === "ar" ? product.description_ar : product.description_fr;
  const details = lang === "ar" ? product.details_ar : product.details_fr;
  const relatedFiltered = related.filter((p) => p.id !== product.id).slice(0, 4);

  function selectedVariantsList(): SelectedVariant[] {
    return product!.variants
      .filter((group) => variantChoices[group.name_fr])
      .map((group) => ({
        name_fr: group.name_fr,
        name_ar: group.name_ar,
        value: variantChoices[group.name_fr],
      }));
  }

  function validateSelection(): boolean {
    if (product!.colors.length > 0 && !color) {
      setSelectionError(t("product_select_color"));
      return false;
    }
    if (product!.sizes.length > 0 && !size) {
      setSelectionError(t("product_select_size"));
      return false;
    }
    for (const group of product!.variants) {
      if (!variantChoices[group.name_fr]) {
        setSelectionError(
          `${t("product_select_option_prefix")} ${lang === "ar" ? group.name_ar : group.name_fr}`
        );
        return false;
      }
    }
    setSelectionError(null);
    return true;
  }

  function handleAddToCart() {
    if (!validateSelection()) return;
    addItem({
      productId: product!.id,
      slug: product!.slug,
      nameFr: product!.name_fr,
      nameAr: product!.name_ar,
      price: product!.price,
      quantity,
      color,
      size,
      variants: selectedVariantsList(),
      imageUrl: images[0]?.url ?? null,
      stock: product!.stock,
      offers: product!.quantity_offers,
    });
    trackAddToCart(product!.id, Number(product!.price) * quantity);
    setAdded(true);
    if (addedTimeout.current) clearTimeout(addedTimeout.current);
    addedTimeout.current = setTimeout(() => setAdded(false), 1100);
  }

  function handleBuyNow() {
    if (!validateSelection()) return;
    checkoutRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const stockLabel =
    product.stock === 0
      ? t("product_out_of_stock")
      : product.stock <= 5
        ? t("product_low_stock")
        : t("product_in_stock");

  // Never reveal the real stock count to customers: the stepper stops at 10
  // (the RPC still rejects anything the stock can't cover).
  const maxQuantity = Math.min(product.stock, 10);
  const savings = lineDiscount(product.price, quantity, product.quantity_offers);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        {/* Gallery */}
        <div>
          <TiltCard className="relative aspect-square overflow-hidden rounded-2xl border border-line bg-panel-2">
            <AnimatePresence mode="popLayout" initial={false}>
              {images[activeImage] ? (
                <motion.img
                  key={activeImage}
                  src={images[activeImage].url}
                  alt={name}
                  width={800}
                  height={800}
                  /* The LCP element on this page — never lazy, and asked for
                     ahead of the rest of the page's requests. */
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  initial={prefersReducedMotion ? false : { opacity: 0, scale: 1.04 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted">
                  <ShoppingBag size={48} />
                </div>
              )}
            </AnimatePresence>
          </TiltCard>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImage(i)}
                  className={cn(
                    "h-16 w-16 overflow-hidden rounded-lg border-2 transition-colors",
                    i === activeImage ? "border-brand" : "border-line"
                  )}
                >
                  <img
                    src={img.url}
                    alt=""
                    width={64}
                    height={64}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Desktop: showcase video sits under the gallery. On mobile it
              renders below the buy buttons instead (see the info column). */}
          {product.video_url && (
            <div className="mt-6 hidden lg:block">
              <h2 className="mb-3 font-heading text-base font-bold text-ink">
                {t("product_video_title")}
              </h2>
              <ProductVideo src={product.video_url} poster={images[0]?.url} />
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          {product.category && (
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-brand">
              {lang === "ar" ? product.category.name_ar : product.category.name_fr}
            </p>
          )}
          <h1 className="font-heading text-2xl font-extrabold text-ink sm:text-3xl">{name}</h1>

          <div className="mt-3 flex items-center gap-3">
            <span className="font-heading text-2xl font-extrabold text-brand">
              {formatPrice(displayPrice ?? product.price)}
            </span>
            {product.compare_at_price != null && product.compare_at_price > product.price && (
              <span className="text-sm text-muted line-through">
                {formatPrice(product.compare_at_price)}
              </span>
            )}
            <Badge tone={product.stock === 0 ? "danger" : "accent"}>{stockLabel}</Badge>
          </div>

          {product.quantity_offers.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {product.quantity_offers.map((offer, i) => (
                <span
                  key={i}
                  className="fx-pop inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3.5 py-1.5 text-xs font-bold text-accent"
                >
                  <Gift size={13} />
                  {offerLabel(offer, lang, formatPrice)}
                </span>
              ))}
            </div>
          )}

          {description && (
            <p className="mt-4 text-sm leading-relaxed text-muted">{description}</p>
          )}

          {product.colors.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-sm font-semibold text-ink">{t("product_color")}</p>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setColor(c);
                      setSelectionError(null);
                    }}
                    className={cn(
                      "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                      color === c
                        ? "border-brand bg-brand/10 text-brand"
                        : "border-line text-muted hover:bg-panel-2"
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {product.sizes.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-semibold text-ink">{t("product_size")}</p>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setSize(s);
                      setSelectionError(null);
                    }}
                    className={cn(
                      "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                      size === s
                        ? "border-brand bg-brand/10 text-brand"
                        : "border-line text-muted hover:bg-panel-2"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {product.variants.map((group) => (
            <div key={group.name_fr} className="mt-4">
              <p className="mb-2 text-sm font-semibold text-ink">
                {lang === "ar" ? group.name_ar : group.name_fr}
              </p>
              <div className="flex flex-wrap gap-2">
                {group.values.map((value) => (
                  <button
                    key={value}
                    onClick={() => {
                      setVariantChoices((prev) => ({ ...prev, [group.name_fr]: value }));
                      setSelectionError(null);
                    }}
                    className={cn(
                      "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                      variantChoices[group.name_fr] === value
                        ? "border-brand bg-brand/10 text-brand"
                        : "border-line text-muted hover:bg-panel-2"
                    )}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="mt-5">
            <p className="mb-2 text-sm font-semibold text-ink">{t("product_quantity")}</p>
            <div className="flex w-fit items-center gap-3 rounded-xl border border-line px-3 py-2">
              <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="text-muted hover:text-ink">
                <Minus size={16} />
              </button>
              <span className="w-6 text-center text-sm font-semibold">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
                className="text-muted hover:text-ink"
              >
                <Plus size={16} />
              </button>
            </div>
            {savings > 0 && (
              <p className="fx-pop mt-2 flex items-center gap-1.5 text-sm font-bold text-accent">
                <Gift size={14} />
                {t("product_you_save")} {formatPrice(savings)}
              </p>
            )}
          </div>

          {selectionError && (
            <p className="mt-3 text-sm text-red-500">{selectionError}</p>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button
              variant="secondary"
              size="lg"
              className="flex-1"
              disabled={product.stock === 0}
              onClick={handleAddToCart}
            >
              <AnimatePresence mode="wait" initial={false}>
                {added ? (
                  <motion.span
                    key="added"
                    className="flex items-center gap-2"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Check size={18} />
                    {t("product_added")}
                  </motion.span>
                ) : (
                  <motion.span
                    key="add"
                    className="flex items-center gap-2"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ShoppingBag size={18} />
                    {t("product_add_to_cart")}
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
            <Button
              variant="accent"
              size="lg"
              className="flex-1"
              disabled={product.stock === 0}
              onClick={handleBuyNow}
            >
              {t("product_buy_now")}
            </Button>
          </div>

          {product.video_url && (
            <div className="mt-6 lg:hidden">
              <h2 className="mb-3 font-heading text-base font-bold text-ink">
                {t("product_video_title")}
              </h2>
              <ProductVideo src={product.video_url} poster={images[0]?.url} />
            </div>
          )}

          {details.length > 0 && (
            <div className="mt-8 border-t border-line pt-6">
              <h2 className="mb-3 font-heading text-base font-bold text-ink">
                {t("product_details")}
              </h2>
              <ul className="space-y-1.5 text-sm text-muted">
                {details.map((d, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div ref={checkoutRef} className="mt-8 scroll-mt-20 rounded-2xl border border-line bg-panel p-5">
            <h2 className="mb-4 font-heading text-base font-bold text-ink">
              {t("checkout_title")}
            </h2>
            <InlineCheckout
              product={product}
              quantity={quantity}
              color={color}
              size={size}
              variants={selectedVariantsList()}
            />
          </div>
        </div>
      </div>

      {relatedFiltered.length > 0 && (
        <div className="mt-16 border-t border-line pt-10">
          <h2 className="mb-6 font-heading text-xl font-extrabold text-ink">
            {t("product_related")}
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {relatedFiltered.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
