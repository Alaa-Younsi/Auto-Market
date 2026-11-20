import { type ReactNode, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  BadgeCheck,
  Banknote,
  ChevronDown,
  Clock,
  Gift,
  Languages,
  Minus,
  PhoneCall,
  Plus,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";
import type { TranslationKey } from "@/i18n/translations";
import { useLandingPage } from "@/hooks/useLandings";
import { useReviews } from "@/hooks/useReviews";
import { useSeo } from "@/hooks/useSeo";
import { useContact } from "@/hooks/useContact";
import { useCartQuote } from "@/hooks/useCartQuote";
import { useConsentStore } from "@/store/consent";
import { type LandingSectionKey, pickText } from "@/lib/landing";
import { offerLabel } from "@/lib/offers";
import { formatPrice } from "@/lib/format";
import { trackViewContent } from "@/lib/pixel";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/ui/BrandMark";
import { Price } from "@/components/ui/Price";
import { SmartImage } from "@/components/ui/SmartImage";
import { StarRating } from "@/components/ui/StarRating";
import { InlineCheckout } from "@/components/product/InlineCheckout";
import { WhatsAppButton } from "@/components/layout/WhatsAppButton";
import { CookieBanner } from "@/components/layout/CookieBanner";
import { TachometerLoader } from "@/components/effects/TachometerLoader";
import type { Product, SelectedVariant } from "@/types/db";

const DEFAULT_FAQ: [TranslationKey, TranslationKey][] = [
  ["lp_faq_pay_q", "lp_faq_pay_a"],
  ["lp_faq_delivery_q", "lp_faq_delivery_a"],
  ["lp_faq_confirm_q", "lp_faq_confirm_a"],
  ["lp_faq_return_q", "lp_faq_return_a"],
];

const DEFAULT_BENEFITS: { icon: typeof Truck; title: TranslationKey; text: TranslationKey }[] = [
  { icon: Banknote, title: "lp_benefit_cod", text: "lp_benefit_cod_text" },
  { icon: Truck, title: "lp_benefit_delivery", text: "lp_benefit_delivery_text" },
  { icon: PhoneCall, title: "lp_benefit_confirm", text: "lp_benefit_confirm_text" },
  { icon: ShieldCheck, title: "lp_benefit_return", text: "lp_benefit_return_text" },
];

/** Evergreen countdown: a per-visitor deadline that restarts once it has passed. */
function useEvergreenDeadline(slug: string, hours: number | null) {
  const [deadline] = useState<number | null>(() => {
    if (!hours) return null;
    const key = `auto-market-lp-deadline:${slug}`;
    const fresh = Date.now() + hours * 3_600_000;
    try {
      const saved = Number(localStorage.getItem(key));
      if (saved > Date.now()) return saved;
      localStorage.setItem(key, String(fresh));
    } catch {
      /* private mode: the countdown just starts fresh */
    }
    return fresh;
  });
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!deadline) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [deadline]);
  if (!deadline) return null;
  const left = Math.max(0, deadline - now);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(left / 3_600_000))}:${pad(Math.floor((left % 3_600_000) / 60_000))}:${pad(Math.floor((left % 60_000) / 1000))}`;
}

/** First paragraph, cut on a word boundary with an ellipsis — never "les voleu". */
function excerpt(text: string, max: number): string {
  const first = text.split("\n")[0].trim();
  if (first.length <= max) return first;
  const cut = first.slice(0, max);
  const end = cut.lastIndexOf(" ");
  return `${cut.slice(0, end > 40 ? end : max).replace(/[\s,;:.]+$/, "")}…`;
}

function useInView<T extends Element>(ref: React.RefObject<T | null>) {
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return inView;
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-6 text-center font-heading text-2xl font-extrabold text-ink sm:text-3xl">
      {children}
    </h2>
  );
}

function LandingContent({
  slug,
  product,
  landing,
}: {
  slug: string;
  product: Product;
  landing: NonNullable<ReturnType<typeof useLandingPage>["data"]>["landing"];
}) {
  const { t, lang, setLang } = useLanguage();
  const contact = useContact();
  const openCookies = useConsentStore((s) => s.openPanel);
  const { data: reviews = [] } = useReviews();
  const [quantity, setQuantity] = useState(1);
  const [color, setColor] = useState<string | undefined>();
  const [size, setSize] = useState<string | undefined>();
  const [variantChoices, setVariantChoices] = useState<Record<string, string>>({});
  const heroRef = useRef<HTMLElement>(null);
  const orderRef = useRef<HTMLElement>(null);
  const heroVisible = useInView(heroRef);
  const orderVisible = useInView(orderRef);
  const countdown = useEvergreenDeadline(slug, landing.countdown_hours);

  const name = lang === "ar" ? product.name_ar : product.name_fr;
  const description = (lang === "ar" ? product.description_ar : product.description_fr) ?? "";
  const images = product.product_images ?? [];
  const heroImage = landing.hero_image_url ?? images[0]?.url ?? null;
  const headline = pickText(lang, landing.headline_fr, landing.headline_ar, name);
  const sub = pickText(lang, landing.sub_fr, landing.sub_ar, excerpt(description, 200));
  const cta = pickText(lang, landing.cta_fr, landing.cta_ar, t("lp_cta_default"));
  const urgency = pickText(lang, landing.urgency_fr, landing.urgency_ar, t("lp_urgency_default"));
  const details = lang === "ar" ? product.details_ar : product.details_fr;
  const hasCompare = product.compare_at_price != null && product.compare_at_price > product.price;
  const pct = hasCompare
    ? Math.round(100 - (product.price / (product.compare_at_price as number)) * 100)
    : 0;
  const maxQty = Math.max(1, Math.min(product.stock, 10));
  const quote = useCartQuote([
    {
      productId: product.id,
      categoryId: product.category_id,
      price: product.price,
      quantity,
      offers: product.quantity_offers,
    },
  ]);
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.stars, 0) / reviews.length : 0;

  const selectedVariants: SelectedVariant[] = product.variants
    .filter((g) => variantChoices[g.name_fr])
    .map((g) => ({ name_fr: g.name_fr, name_ar: g.name_ar, value: variantChoices[g.name_fr] }));

  useSeo({
    title: `${headline} — ${t("brand_name")}`,
    description: sub.slice(0, 160),
    image: heroImage ?? undefined,
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: once per page view
  useEffect(() => {
    trackViewContent(product.id, Number(product.price));
  }, [product.id]);

  const scrollToOrder = () =>
    orderRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const sections: Record<LandingSectionKey, ReactNode> = {
    countdown: countdown ? (
      <div className="bg-brand text-white">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-center gap-2 px-4 py-4 text-center sm:flex-row sm:gap-4">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Clock size={16} />
            {urgency}
          </span>
          <span
            dir="ltr"
            className="rounded-lg bg-black/20 px-3 py-1 font-mono text-lg font-bold tracking-wider"
          >
            {countdown}
          </span>
        </div>
      </div>
    ) : null,

    gallery:
      images.length > 1 ? (
        <section className="mx-auto max-w-5xl px-4 py-12">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {images.slice(0, 5).map((img, i) => (
              <div
                key={img.id}
                className={cn(
                  "overflow-hidden rounded-2xl border border-line bg-panel-2",
                  i === 0 ? "col-span-2 row-span-2 aspect-square" : "aspect-square"
                )}
              >
                <SmartImage
                  src={img.url}
                  alt={img.alt ?? name}
                  sizes={
                    i === 0 ? "(max-width: 640px) 100vw, 50vw" : "(max-width: 640px) 50vw, 25vw"
                  }
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        </section>
      ) : null,

    benefits: (
      <section className="bg-panel-2/50 py-12">
        <div className="mx-auto max-w-5xl px-4">
          <SectionTitle>{t("lp_why")}</SectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {landing.benefits.length > 0
              ? landing.benefits.map((b, i) => (
                  <div key={i} className="rounded-2xl border border-line bg-panel p-5 shadow-card">
                    <BadgeCheck size={22} className="text-brand" />
                    <h3 className="mt-3 font-heading text-base font-bold text-ink">
                      {pickText(lang, b.title_fr, b.title_ar)}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted">
                      {pickText(lang, b.text_fr, b.text_ar)}
                    </p>
                  </div>
                ))
              : DEFAULT_BENEFITS.map((b) => (
                  <div
                    key={b.title}
                    className="rounded-2xl border border-line bg-panel p-5 shadow-card"
                  >
                    <b.icon size={22} className="text-brand" />
                    <h3 className="mt-3 font-heading text-base font-bold text-ink">{t(b.title)}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{t(b.text)}</p>
                  </div>
                ))}
          </div>
        </div>
      </section>
    ),

    story:
      landing.story_fr || landing.story_ar ? (
        <section className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-8 px-4 py-12 md:grid-cols-2">
          {(landing.story_image_url ?? images[1]?.url) && (
            <div className="overflow-hidden rounded-2xl border border-line bg-panel-2">
              <SmartImage
                src={(landing.story_image_url ?? images[1]?.url) as string}
                alt=""
                sizes="(max-width: 768px) 100vw, 50vw"
                className="aspect-[4/3] h-full w-full object-cover"
              />
            </div>
          )}
          <div>
            <h2 className="font-heading text-2xl font-extrabold text-ink sm:text-3xl">
              {pickText(lang, landing.story_title_fr, landing.story_title_ar, name)}
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-ink/80">
              {pickText(lang, landing.story_fr, landing.story_ar)
                .split(/\n{2,}/)
                .map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
            </div>
          </div>
        </section>
      ) : null,

    specs:
      details.length > 0 ? (
        <section className="mx-auto max-w-3xl px-4 py-12">
          <SectionTitle>{t("lp_specs")}</SectionTitle>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-panel">
            {details.map((d, i) => {
              const m = d.match(/^([^:]{1,40})\s*:\s*(.+)$/);
              return (
                <li key={i} className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
                  {m ? (
                    <>
                      <span className="text-muted">{m[1]}</span>
                      <span className="text-end font-semibold text-ink">{m[2]}</span>
                    </>
                  ) : (
                    <span className="flex items-start gap-2 text-ink">
                      <BadgeCheck size={16} className="mt-0.5 shrink-0 text-accent" />
                      {d}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null,

    offers:
      product.quantity_offers.length > 0 ? (
        <section className="mx-auto max-w-4xl px-4 py-12">
          <SectionTitle>{t("lp_offers")}</SectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {product.quantity_offers.map((o, i) => {
              const qty = o.type === "free" ? o.buy + o.get : o.qty;
              const active = quantity === qty;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={qty > maxQty}
                  onClick={() => {
                    setQuantity(qty);
                    scrollToOrder();
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border p-4 text-start transition-colors disabled:opacity-50",
                    active
                      ? "border-accent bg-accent/10"
                      : "border-line bg-panel hover:border-accent/50"
                  )}
                >
                  <span className="rounded-xl bg-accent/15 p-2.5 text-accent">
                    <Gift size={20} />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-heading text-base font-bold text-ink">
                      {offerLabel(o, lang, formatPrice)}
                    </span>
                    <span className="text-xs text-muted">
                      {qty} × {name}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null,

    order: (
      <section ref={orderRef} id="commander" className="scroll-mt-4 bg-panel-2/50 py-12">
        <div className="mx-auto max-w-xl px-4">
          <SectionTitle>{t("lp_order_title")}</SectionTitle>
          <div className="rounded-2xl border border-line bg-panel p-4 shadow-card sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              {images[0] && (
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-panel-2">
                  <SmartImage
                    src={images[0].url}
                    alt=""
                    sizes="64px"
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">{name}</p>
                <Price
                  value={product.price}
                  className="font-heading text-lg font-extrabold text-brand"
                />
              </div>
            </div>

            {product.colors.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-sm font-semibold text-ink">{t("product_color")}</p>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((c) => {
                    const label = lang === "ar" ? c.label_ar : c.label_fr;
                    return (
                      <button
                        key={`${c.hex}-${label}`}
                        type="button"
                        onClick={() => setColor(label)}
                        className={cn(
                          "flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium",
                          color === label
                            ? "border-brand bg-brand/10 text-brand"
                            : "border-line text-muted"
                        )}
                      >
                        <span
                          className="h-4 w-4 rounded-full border border-line"
                          style={{ backgroundColor: c.hex }}
                        />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {product.sizes.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-sm font-semibold text-ink">{t("product_size")}</p>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSize(s)}
                      className={cn(
                        "rounded-full border px-4 py-1.5 text-sm font-medium",
                        size === s
                          ? "border-brand bg-brand/10 text-brand"
                          : "border-line text-muted"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {product.variants.map((g) => (
              <div key={g.name_fr} className="mb-4">
                <p className="mb-2 text-sm font-semibold text-ink">
                  {lang === "ar" ? g.name_ar : g.name_fr}
                </p>
                <div className="flex flex-wrap gap-2">
                  {g.values.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setVariantChoices((p) => ({ ...p, [g.name_fr]: opt.value }))}
                      className={cn(
                        "rounded-full border px-4 py-1.5 text-sm font-medium",
                        variantChoices[g.name_fr] === opt.value
                          ? "border-brand bg-brand/10 text-brand"
                          : "border-line text-muted"
                      )}
                    >
                      {opt.value}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="mb-5 flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-ink">{t("product_quantity")}</span>
              <div className="flex items-center gap-3 rounded-xl border border-line px-3 py-2">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="-m-1.5 p-1.5 text-muted hover:text-ink"
                  aria-label={t("product_qty_decrease")}
                >
                  <Minus size={16} />
                </button>
                <span className="w-6 text-center text-sm font-semibold">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                  className="-m-1.5 p-1.5 text-muted hover:text-ink"
                  aria-label={t("product_qty_increase")}
                >
                  <Plus size={16} />
                </button>
              </div>
              {quote.discount > 0 && (
                <span className="flex items-center gap-1.5 text-sm font-bold text-accent">
                  <Gift size={14} />
                  {t("product_you_save")} <Price value={quote.discount} />
                </span>
              )}
            </div>

            {product.stock > 0 ? (
              <InlineCheckout
                product={product}
                quantity={quantity}
                color={color}
                size={size}
                variants={selectedVariants}
                submitLabel={cta}
              />
            ) : (
              <p className="rounded-xl bg-red-500/10 px-3 py-3 text-center text-sm font-semibold text-red-500">
                {t("product_out_of_stock")}
              </p>
            )}
          </div>
        </div>
      </section>
    ),

    reviews:
      reviews.length > 0 ? (
        <section className="mx-auto max-w-5xl px-4 py-12">
          <SectionTitle>{t("lp_reviews")}</SectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.slice(0, 6).map((r) => (
              <figure
                key={r.id}
                className="rounded-2xl border border-line bg-panel p-5 shadow-card"
              >
                <StarRating value={r.stars} size={14} />
                <blockquote className="mt-3 text-sm leading-relaxed text-ink/85" dir="auto">
                  {r.review_text}
                </blockquote>
                <figcaption className="mt-3 text-xs font-semibold text-muted" dir="auto">
                  {r.client_name}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : null,

    faq: (
      <section className="mx-auto max-w-3xl px-4 py-12">
        <SectionTitle>{t("lp_faq")}</SectionTitle>
        <div className="space-y-2">
          {(landing.faq.length > 0
            ? landing.faq.map(
                (f) => [pickText(lang, f.q_fr, f.q_ar), pickText(lang, f.a_fr, f.a_ar)] as const
              )
            : DEFAULT_FAQ.map(([q, a]) => [t(q), t(a)] as const)
          ).map(([q, a], i) => (
            <details
              key={i}
              className="group rounded-2xl border border-line bg-panel p-4 open:shadow-card"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-ink">
                {q}
                <ChevronDown
                  size={18}
                  className="shrink-0 text-muted transition-transform group-open:rotate-180"
                />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>
    ),
  };

  return (
    <div className="min-h-dvh bg-bg pb-24 lg:pb-0">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <span className="flex items-center gap-2">
            <BrandMark className="h-8 w-8 shadow-none" />
            <span className="font-heading text-base font-extrabold text-ink">
              {t("brand_name")}
            </span>
          </span>
          <div className="flex items-center gap-1">
            <a
              href={contact.phoneHref}
              className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-muted hover:text-ink sm:flex"
            >
              <PhoneCall size={15} />
              <bdi dir="ltr">{contact.phone}</bdi>
            </a>
            <button
              type="button"
              onClick={() => setLang(lang === "fr" ? "ar" : "fr")}
              className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm font-semibold text-ink hover:border-brand"
            >
              <Languages size={15} />
              {lang === "fr" ? "العربية" : "Français"}
            </button>
          </div>
        </div>
      </header>

      <section
        ref={heroRef}
        className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-8 px-4 py-8 md:grid-cols-2 md:py-14"
      >
        {heroImage && (
          <div className="relative overflow-hidden rounded-3xl border border-line bg-panel-2">
            <SmartImage
              src={heroImage}
              alt={name}
              sizes="(max-width: 768px) 100vw, 50vw"
              className="aspect-square h-full w-full object-cover"
              loading="eager"
              fetchPriority="high"
            />
            {hasCompare && (
              <span
                dir="ltr"
                className="absolute start-3 top-3 rounded-full bg-accent px-3 py-1 text-sm font-bold text-white"
              >
                -{pct}%
              </span>
            )}
          </div>
        )}
        <div>
          {reviews.length > 0 && (
            <div className="mb-3 flex items-center gap-2 text-sm text-muted">
              <StarRating value={Math.round(avgRating)} size={15} />
              <span>
                {avgRating.toFixed(1)} · {reviews.length} {t("lp_reviews_count")}
              </span>
            </div>
          )}
          <h1 className="font-heading text-3xl font-extrabold leading-tight text-ink text-balance sm:text-4xl">
            {headline}
          </h1>
          {sub && <p className="mt-4 text-base leading-relaxed text-ink/75 text-pretty">{sub}</p>}
          <div className="mt-5 flex flex-wrap items-baseline gap-3">
            <Price
              value={product.price}
              className="font-heading text-3xl font-extrabold text-brand"
            />
            {hasCompare && (
              <Price
                value={product.compare_at_price as number}
                className="text-lg text-muted line-through"
              />
            )}
            {hasCompare && (
              <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-bold text-accent">
                {t("lp_you_save")}{" "}
                <Price value={(product.compare_at_price as number) - product.price} />
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={scrollToOrder}
            disabled={product.stock === 0}
            className="mt-6 w-full rounded-xl bg-accent px-6 py-4 text-base font-bold text-white shadow-glow-green transition hover:brightness-110 disabled:opacity-50 sm:w-auto"
          >
            {product.stock === 0 ? t("product_out_of_stock") : cta}
          </button>
          <ul className="mt-6 grid grid-cols-1 gap-2 text-sm text-ink/80 sm:grid-cols-2">
            <li className="flex items-center gap-2">
              <Banknote size={16} className="text-accent" />
              {t("lp_trust_cod")}
            </li>
            <li className="flex items-center gap-2">
              <Truck size={16} className="text-accent" />
              {t("lp_trust_delivery")}
            </li>
            <li className="flex items-center gap-2">
              <PhoneCall size={16} className="text-accent" />
              {t("lp_trust_confirm")}
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-accent" />
              {t("lp_trust_return")}
            </li>
          </ul>
        </div>
      </section>

      {landing.sections
        .filter((s) => s.visible)
        .map((s) => (
          <div key={s.key}>{sections[s.key]}</div>
        ))}

      <section className="px-4 py-14 text-center">
        <h2 className="font-heading text-2xl font-extrabold text-ink sm:text-3xl">{headline}</h2>
        <p className="mt-2 text-sm text-muted">{t("lp_closing")}</p>
        <button
          type="button"
          onClick={scrollToOrder}
          disabled={product.stock === 0}
          className="mt-5 rounded-xl bg-accent px-8 py-4 text-base font-bold text-white shadow-glow-green transition hover:brightness-110 disabled:opacity-50"
        >
          {cta}
        </button>
      </section>

      <footer className="border-t border-line px-4 py-6 text-center text-xs text-muted">
        <p>
          © {new Date().getFullYear()} {t("brand_name")} ·{" "}
          <Link to="/cgv" className="hover:text-brand">
            {t("legal_nav_cgv")}
          </Link>{" "}
          ·{" "}
          <Link to="/confidentialite" className="hover:text-brand">
            {t("legal_nav_privacy")}
          </Link>{" "}
          ·{" "}
          <Link to="/politique" className="hover:text-brand">
            {t("legal_nav_policy")}
          </Link>{" "}
          ·{" "}
          <button type="button" onClick={openCookies} className="hover:text-brand">
            {t("cookie_manage")}
          </button>
        </p>
      </footer>

      {/* Phone: the CTA stays one tap away, except while the form itself is on screen. */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-20 border-t border-line bg-panel/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur transition-transform duration-300 lg:hidden",
          !heroVisible && !orderVisible && product.stock > 0 ? "translate-y-0" : "translate-y-full"
        )}
        aria-hidden={heroVisible || orderVisible}
      >
        <div className="flex items-center gap-3 pe-[4.75rem]">
          <Price value={product.price} className="font-heading text-lg font-extrabold text-brand" />
          <button
            type="button"
            onClick={scrollToOrder}
            tabIndex={heroVisible || orderVisible ? -1 : 0}
            className="flex-1 rounded-xl bg-accent px-4 py-3 text-sm font-bold text-white"
          >
            {cta}
          </button>
        </div>
      </div>

      <WhatsAppButton />
      <CookieBanner />
    </div>
  );
}

export default function LandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useLanguage();
  const { data, isLoading } = useLandingPage(slug);

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <TachometerLoader />
      </div>
    );
  }
  if (!data || !slug) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg px-4 text-center">
        <p className="text-muted">{t("not_found_message")}</p>
        <Link to="/shop" className="font-semibold text-brand hover:underline">
          {t("nav_shop")}
        </Link>
      </div>
    );
  }
  return <LandingContent slug={slug} product={data.product} landing={data.landing} />;
}
