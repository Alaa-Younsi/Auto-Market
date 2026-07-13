import { useRef } from "react";
import { motion, useScroll } from "framer-motion";
import {
  BadgeCheck,
  ChevronRight,
  Headset,
  Sparkles,
  Truck,
  Wallet,
} from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";
import { useCategories } from "@/hooks/useCategories";
import { useMediaFlags } from "@/hooks/useMediaFlags";
import { useProducts } from "@/hooks/useProducts";
import { useReviews } from "@/hooks/useReviews";
import { useSeo } from "@/hooks/useSeo";
import { HeroScene } from "@/components/effects/HeroScene";
import { RoadDivider } from "@/components/effects/RoadDivider";
import { ScrollRoad } from "@/components/effects/ScrollRoad";
import { StatCounter } from "@/components/effects/StatCounter";
import { StaggerText } from "@/components/effects/StaggerText";
import { ReviewsMarquee } from "@/components/effects/ReviewsMarquee";
import { ProductCard } from "@/components/product/ProductCard";
import { LinkButton } from "@/components/ui/LinkButton";
import { BentoPanel } from "@/components/ui/BentoPanel";
import { cn } from "@/lib/utils";

export default function Landing() {
  const { t, lang } = useLanguage();
  const { data: categories = [] } = useCategories();
  const { data: featured = [] } = useProducts({ featuredOnly: true });
  const { data: reviews = [] } = useReviews();
  const { enableHeavyEffects } = useMediaFlags();

  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  // The car sits in whichever half of the frame the copy doesn't occupy.
  const heroSideOffset = lang === "ar" ? -1 : 1;
  const heroScrollProgress = enableHeavyEffects ? scrollYProgress : null;

  useSeo({
    title: `${t("brand_name")} — ${t("brand_tagline")}`,
    description: t("hero_subtitle"),
  });

  const trustItems = [
    { icon: Wallet, title: t("trust_cod"), desc: t("trust_cod_desc") },
    { icon: Truck, title: t("trust_delivery"), desc: t("trust_delivery_desc") },
    { icon: BadgeCheck, title: t("trust_quality"), desc: t("trust_quality_desc") },
    { icon: Headset, title: t("trust_support"), desc: t("trust_support_desc") },
  ];

  const stats: {
    value: number;
    label: string;
    suffix?: string;
    decimals?: number;
  }[] = [
    { value: 1200, suffix: "+", label: t("hero_stat_products") },
    { value: 58, label: t("hero_stat_wilayas") },
    { value: 15, suffix: "K+", label: t("hero_stat_clients") },
    { value: 4.8, decimals: 1, suffix: "/5", label: t("hero_stat_rating") },
  ];

  return (
    <div>
      <ScrollRoad />

      {/* Hero */}
      <section ref={heroRef} className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 start-1/2 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-brand/10 blur-[100px]" />

        {/* 3D scene. Below lg it's a strip under the copy and ignores pointer
            events so a touch drag scrolls the page instead of orbiting the car;
            from lg up it spans the hero and the copy sits over it. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[300px] overflow-hidden rounded-3xl sm:h-[340px] lg:inset-0 lg:h-auto lg:rounded-none lg:pointer-events-auto xl:inset-x-[5%]">
          <HeroScene sideOffset={heroSideOffset} scrollProgress={heroScrollProgress} />
        </div>

        {/* Scrims: keep the copy legible over the scene, and fade the scene out
            where it meets the section edges. `from-bg` tracks the theme token. */}
        <div className="pointer-events-none absolute inset-0 hidden bg-gradient-to-r from-bg from-15% via-bg/65 to-transparent lg:block rtl:bg-gradient-to-l" />
        <div className="pointer-events-none absolute inset-x-0 bottom-[290px] h-24 bg-gradient-to-b from-bg to-transparent sm:bottom-[330px] lg:hidden" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-bg to-transparent" />

        {/* Copy. The wrapper is click-through so drags over the empty half of
            the hero reach OrbitControls; interactive children opt back in. */}
        <div className="pointer-events-none relative z-10 mx-auto max-w-7xl px-4 pb-[330px] pt-8 sm:px-6 sm:pb-[370px] lg:px-8 lg:pb-24 lg:pt-10">
          <motion.div
            className="max-w-xl lg:max-w-[46%]"
            initial={{ x: lang === "ar" ? 24 : -24 }}
            animate={{ x: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* The pulse ring belongs on the dot: on the pill its ::after
                covers the label every cycle. */}
            <span className="relative mb-5 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-xs font-bold text-accent">
              <span className="fx-pulse-dot relative inline-block h-1.5 w-1.5 rounded-full bg-accent" />
              <Sparkles size={13} />
              {t("hero_badge")}
            </span>

            <h1 className="font-heading text-3xl font-extrabold leading-[1.08] tracking-tight text-ink sm:text-4xl lg:text-5xl xl:text-[3.4rem]">
              <StaggerText text={t("hero_title_line1")} />
              <br />
              <StaggerText
                text={t("hero_title_line2")}
                wordClassName="fx-gradient-text"
                baseDelay={0.25}
              />
            </h1>

            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted sm:text-lg">
              {t("hero_subtitle")}
            </p>

            <div className="pointer-events-auto mt-8 flex flex-wrap gap-3">
              <LinkButton to="/shop" size="lg">
                {t("hero_cta_shop")}
                <ChevronRight size={18} className="rtl:rotate-180" />
              </LinkButton>
              <LinkButton to="/shop" variant="secondary" size="lg">
                {t("hero_cta_categories")}
              </LinkButton>
            </div>

            <div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-6 border-t border-line pt-8 sm:grid-cols-4">
              {stats.map((s) => (
                <StatCounter
                  key={s.label}
                  value={s.value}
                  suffix={s.suffix}
                  decimals={s.decimals}
                  label={s.label}
                />
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trust badges */}
      <section className="border-y border-line bg-panel-2/50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {trustItems.map((item) => (
              <div key={item.title} className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <item.icon size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-ink">{item.title}</p>
                  <p className="text-xs text-muted">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="pt-10">
        <RoadDivider />
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="font-heading text-2xl font-extrabold text-ink sm:text-3xl">
                {t("categories_title")}
              </h2>
              <p className="mt-1 text-sm text-muted">{t("categories_subtitle")}</p>
            </div>
            <LinkButton to="/shop" variant="ghost" size="sm">
              {t("view_all")}
              <ChevronRight size={16} className="rtl:rotate-180" />
            </LinkButton>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((cat, i) => (
              <motion.a
                key={cat.id}
                href={`/shop?category=${cat.id}`}
                initial={{ y: 20 }}
                whileInView={{ y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="fx-lift group relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-2xl border border-line bg-panel-2 p-4"
              >
                {cat.image_url ? (
                  <img
                    src={cat.image_url}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div
                    className={cn(
                      "absolute inset-0 bg-gradient-to-br from-brand/25 via-panel-2 to-accent/15"
                    )}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <span className="relative font-heading text-sm font-bold text-white sm:text-base">
                  {lang === "ar" ? cat.name_ar : cat.name_fr}
                </span>
              </motion.a>
            ))}
          </div>
        </section>
      )}

      {/* Featured products */}
      {featured.length > 0 && (
        <section className="bg-panel-2/40 py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex items-end justify-between">
              <div>
                <h2 className="font-heading text-2xl font-extrabold text-ink sm:text-3xl">
                  {t("featured_title")}
                </h2>
                <p className="mt-1 text-sm text-muted">{t("featured_subtitle")}</p>
              </div>
              <LinkButton to="/shop" variant="ghost" size="sm">
                {t("view_all")}
                <ChevronRight size={16} className="rtl:rotate-180" />
              </LinkButton>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {featured.slice(0, 8).map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      <RoadDivider />

      {/* How it works */}
      <section className="cv-auto mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="font-heading text-2xl font-extrabold text-ink sm:text-3xl">
            {t("how_title")}
          </h2>
          <p className="mt-2 text-sm text-muted">{t("how_subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            { n: "01", title: t("how_step1_title"), desc: t("how_step1_desc") },
            { n: "02", title: t("how_step2_title"), desc: t("how_step2_desc") },
            { n: "03", title: t("how_step3_title"), desc: t("how_step3_desc") },
          ].map((step, i) => (
            <motion.div
              key={step.n}
              initial={{ y: 20 }}
              whileInView={{ y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <BentoPanel glow className="fx-lift h-full p-6">
                <span className="fx-gradient-text font-heading text-3xl font-black">
                  {step.n}
                </span>
                <h3 className="mt-3 font-heading text-base font-bold text-ink">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{step.desc}</p>
              </BentoPanel>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Reviews */}
      {reviews.length > 0 && (
        <section className="cv-auto border-t border-line bg-panel-2/40 py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 text-center">
              <h2 className="font-heading text-2xl font-extrabold text-ink sm:text-3xl">
                {t("reviews_title")}
              </h2>
              <p className="mt-2 text-sm text-muted">{t("reviews_subtitle")}</p>
            </div>

            <ReviewsMarquee reviews={reviews.slice(0, 10)} />
          </div>
        </section>
      )}

      {/* CTA banner */}
      <section className="cv-auto mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand via-brand to-brand-dark px-6 py-14 text-center sm:px-16">
          <div className="pointer-events-none absolute -end-10 -top-10 h-56 w-56 rounded-full bg-accent/30 blur-[70px]" />
          <div className="pointer-events-none absolute -start-10 -bottom-10 h-56 w-56 rounded-full bg-white/10 blur-[70px]" />
          <span aria-hidden="true" className="fx-beams" />
          <h2 className="relative font-heading text-2xl font-extrabold text-white sm:text-3xl">
            {t("cta_banner_title")}
          </h2>
          <p className="relative mx-auto mt-2 max-w-md text-sm text-white/85">
            {t("cta_banner_subtitle")}
          </p>
          <div className="relative mt-7">
            <LinkButton to="/shop" variant="accent" size="lg">
              {t("cta_banner_button")}
            </LinkButton>
          </div>
        </div>
      </section>
    </div>
  );
}
