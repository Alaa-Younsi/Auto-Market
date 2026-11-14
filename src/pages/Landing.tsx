import { useRef } from "react";
import { motion, useScroll } from "framer-motion";
import { BadgeCheck, ChevronDown, ChevronRight, Headset, Truck, Wallet } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";
import { useCategories } from "@/hooks/useCategories";
import { useMediaFlags } from "@/hooks/useMediaFlags";
import { useProducts } from "@/hooks/useProducts";
import { useReviews } from "@/hooks/useReviews";
import { useSeo } from "@/hooks/useSeo";
import { HeroScene } from "@/components/effects/HeroScene";
import { TelltaleStrip, type Telltale } from "@/components/effects/TelltaleStrip";
import { StaggerText } from "@/components/effects/StaggerText";
import { ReviewsMarquee } from "@/components/effects/ReviewsMarquee";
import { ProductCard } from "@/components/product/ProductCard";
import { LinkButton } from "@/components/ui/LinkButton";
import { BentoPanel } from "@/components/ui/BentoPanel";
import { SmartImage } from "@/components/ui/SmartImage";
import { cn } from "@/lib/utils";

export default function Landing() {
  const { t, lang } = useLanguage();
  const { data: categories = [] } = useCategories();
  const { data: featured = [] } = useProducts({ featuredOnly: true });
  const { data: reviews = [] } = useReviews();
  const { enableHeavyEffects, isDesktop } = useMediaFlags();

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

  const trustItems: Telltale[] = [
    { icon: Wallet, title: t("trust_cod"), desc: t("trust_cod_desc"), tone: "green" },
    { icon: Truck, title: t("trust_delivery"), desc: t("trust_delivery_desc"), tone: "blue" },
    { icon: BadgeCheck, title: t("trust_quality"), desc: t("trust_quality_desc"), tone: "amber" },
    { icon: Headset, title: t("trust_support"), desc: t("trust_support_desc"), tone: "cyan" },
  ];

  return (
    <div>
      {/* Hero.
          Desktop: one full-height frame, copy on one side and the 3D car on the
          other. Below lg: the hero is ONLY the copy, full screen over the photo,
          and the car gets its own section right after it that drives in as you
          scroll — a phone was too short for both, and the car was squeezed into
          a strip under the buttons. Exactly one HeroScene is ever mounted. */}
      <section
        ref={heroRef}
        className="relative flex min-h-[calc(100vh-3.5rem)] min-h-[calc(100svh-3.5rem)] flex-col overflow-hidden"
      >
        {!isDesktop && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            {/* The phone hero's LCP image: 25–48 KB WebP (was a 2.2 MB PNG). */}
            <img
              src="/bg-hero-720.webp"
              srcSet="/bg-hero-720.webp 720w, /bg-hero-1080.webp 1080w"
              sizes="100vw"
              alt=""
              width={720}
              height={1280}
              fetchPriority="high"
              decoding="async"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-bg/55 via-bg/70 to-bg" />
          </div>
        )}

        <div className="pointer-events-none absolute -top-24 start-1/2 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-brand/10 blur-[100px]" />

        {isDesktop && (
          <>
            {/* Spans the hero; the copy sits over it, click-through so drags on
                the empty half reach OrbitControls. */}
            <div className="absolute inset-0 xl:inset-x-[5%]">
              <HeroScene sideOffset={heroSideOffset} scrollProgress={heroScrollProgress} />
            </div>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-bg from-15% via-bg/65 to-transparent rtl:bg-gradient-to-l" />
          </>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-bg to-transparent" />

        <div className="pointer-events-none relative z-10 mx-auto my-auto w-full max-w-7xl px-5 py-12 sm:px-6 lg:px-8 lg:pb-24 lg:pt-10">
          <motion.div
            className="max-w-xl lg:max-w-[46%]"
            initial={{ x: lang === "ar" ? 24 : -24 }}
            animate={{ x: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Two short lines: what you get, then the promise that removes the
                risk. Arabic gets more line-height and no negative tracking —
                Cairo's tall ascenders collide and tracking breaks letter joins. */}
            <h1 className="font-heading text-[2.6rem] font-extrabold leading-[1.02] tracking-[-0.03em] text-ink sm:text-6xl lg:text-[3.5rem] xl:text-[4rem] [html[lang=ar]_&]:leading-[1.3] [html[lang=ar]_&]:tracking-normal">
              <StaggerText text={t("hero_title_line1")} className="block" />
              <StaggerText
                text={t("hero_title_line2")}
                className="block"
                wordClassName="fx-gradient-text"
                baseDelay={0.2}
              />
            </h1>

            <p className="mt-6 max-w-md text-pretty text-base leading-relaxed text-ink/75 sm:text-lg">
              {t("hero_subtitle")}
            </p>

            <div className="pointer-events-auto mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <LinkButton to="/shop" size="lg" className="justify-center">
                {t("hero_cta_shop")}
                <ChevronRight size={18} className="rtl:rotate-180" />
              </LinkButton>
              <LinkButton to="/shop" variant="secondary" size="lg" className="justify-center">
                {t("hero_cta_categories")}
              </LinkButton>
            </div>
          </motion.div>
        </div>

        {/* Scroll cue (phones/tablets): there is a car waiting below. */}
        {!isDesktop && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-5 z-10 flex justify-center"
          >
            <span className="fx-scroll-cue flex h-10 w-10 items-center justify-center rounded-full border border-line/70 bg-panel/60 text-muted backdrop-blur">
              <ChevronDown size={18} />
            </span>
          </div>
        )}
      </section>

      {/* Below lg: the car's own stage, revealed on scroll. The 3D engine is only
          fetched when this section approaches the screen (mountWhenNear), so a
          phone pays nothing for it on first load. Position-only motion. */}
      {!isDesktop && (
        <section aria-hidden="true" className="relative overflow-hidden">
          <motion.div
            initial={{ y: 60 }}
            whileInView={{ y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none relative h-[340px] sm:h-[440px]"
          >
            <HeroScene sideOffset={0} scrollProgress={null} mountWhenNear />
            <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-bg to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-bg to-transparent" />
          </motion.div>
        </section>
      )}

      {/* Trust promises, as the cluster's warning lights */}
      <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <TelltaleStrip items={trustItems} />
      </section>

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
                  // Resized per tile through the storage render endpoint: the raw
                  // uploads are up to 2 MB JPEGs for a ~300px tile.
                  <SmartImage
                    src={cat.image_url}
                    alt=""
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px"
                    className="absolute inset-0 h-full w-full object-cover transition-[transform,opacity] duration-500 group-hover:scale-110"
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
              {featured.slice(0, 4).map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

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
                <span className="fx-gradient-text font-heading text-3xl font-black">{step.n}</span>
                <h3 className="mt-3 font-heading text-base font-bold text-ink">{step.title}</h3>
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
