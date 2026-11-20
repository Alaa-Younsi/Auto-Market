import { Fragment, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageProvider";
import type { TranslationKey } from "@/i18n/translations";
import { useContact } from "@/hooks/useContact";
import { type LegalVars, resolveLegal, useLegalOverrides } from "@/hooks/useLegal";
import { useSeo } from "@/hooks/useSeo";
import { LEGAL_PAGES, type LegalPageKey } from "@/content/legal";
import { cn } from "@/lib/utils";

const NAV_KEY: Record<LegalPageKey, TranslationKey> = {
  policy: "legal_nav_policy",
  mentions: "legal_nav_mentions",
  cgv: "legal_nav_cgv",
  privacy: "legal_nav_privacy",
  cookies: "legal_nav_cookies",
};

/** Blank line = new paragraph, "- " lines = a bullet list. Plain text only: no HTML is ever interpreted. */
export function LegalBody({ text }: { text: string }) {
  const blocks = text.replace(/\r\n/g, "\n").split(/\n{2,}/);
  return (
    <>
      {blocks.map((block, i) => {
        const lines = block.split("\n").filter((l) => l.trim() !== "");
        if (lines.length === 0) return null;
        if (lines.every((l) => l.trimStart().startsWith("- "))) {
          return (
            <ul key={i} className="list-disc space-y-1.5 ps-5 marker:text-brand">
              {lines.map((l, j) => (
                <li key={j}>{l.trimStart().slice(2)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {l}
              </Fragment>
            ))}
          </p>
        );
      })}
    </>
  );
}

export default function Legal({ page }: { page: LegalPageKey }) {
  const { t, lang } = useLanguage();
  const contact = useContact();
  const { data } = useLegalOverrides(page);

  const vars: LegalVars = {
    store: contact.legal.name ?? t("brand_name"),
    phone: `⁦${contact.phone}⁩`,
    email: contact.email ? `⁦${contact.email}⁩` : `⁦${contact.phone}⁩`,
    domain: "⁦www.auto-market.shop⁩",
  };
  const resolved = resolveLegal(page, lang, data, vars);

  useSeo({
    title: `${resolved.title} — ${t("brand_name")}`,
    description: resolved.intro.replace(/[⁦-⁩]/g, "").slice(0, 160),
  });

  const identity: [TranslationKey, string | null][] = [
    ["settings_legal_name", contact.legal.name ?? t("brand_name")],
    ["settings_legal_owner", contact.legal.owner],
    ["settings_legal_rc", contact.legal.rc],
    ["settings_legal_nif", contact.legal.nif],
    ["settings_legal_nis", contact.legal.nis],
    ["settings_legal_ai", contact.legal.ai],
    ["settings_address", contact.address],
    ["settings_phone", contact.phone],
    ["settings_email", contact.email],
  ];

  const identityCard: ReactNode = (
    <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 rounded-xl border border-line bg-panel-2/60 p-4 text-sm sm:grid-cols-2">
      {identity
        .filter(([, v]) => v)
        .map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="text-xs text-muted">{t(k)}</dt>
            <dd className="font-semibold text-ink [overflow-wrap:anywhere]" dir="auto">
              {v}
            </dd>
          </div>
        ))}
    </dl>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <nav
        aria-label={t("footer_legal")}
        className="-mx-4 mb-8 overflow-x-auto px-4 sm:mx-0 sm:px-0"
      >
        <ul className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
          {LEGAL_PAGES.map((p) => (
            <li key={p.key}>
              <Link
                to={p.path}
                aria-current={p.key === page ? "page" : undefined}
                className={cn(
                  "block whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
                  p.key === page
                    ? "border-brand bg-brand/10 text-brand"
                    : "border-line text-muted hover:border-brand/50 hover:text-ink"
                )}
              >
                {t(NAV_KEY[p.key])}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <header className="max-w-3xl">
        <h1 className="font-heading text-3xl font-extrabold leading-tight text-ink sm:text-4xl">
          {resolved.title}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-ink/80">{resolved.intro}</p>
        <p className="mt-3 text-xs text-muted">{resolved.updated}</p>
      </header>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[15rem_1fr]">
        {resolved.sections.length > 2 && (
          <aside className="hidden lg:block">
            <ol className="sticky top-24 space-y-1 border-s border-line text-sm">
              {resolved.sections.map((s, i) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="-ms-px block border-s-2 border-transparent py-1 ps-4 text-muted transition-colors hover:border-brand hover:text-ink"
                  >
                    <span className="me-2 font-mono text-xs text-brand">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </aside>
        )}

        <div className={cn("min-w-0 space-y-6", resolved.sections.length <= 2 && "lg:col-span-2")}>
          {resolved.sections.map((s, i) => (
            <section
              key={s.id}
              id={s.id}
              className="scroll-mt-24 rounded-2xl border border-line bg-panel p-5 shadow-card sm:p-6"
            >
              <h2 className="flex items-baseline gap-3 font-heading text-lg font-bold text-ink">
                <span className="font-mono text-sm text-brand">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">{s.title}</span>
              </h2>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-ink/80 [overflow-wrap:anywhere]">
                <LegalBody text={s.body} />
              </div>
              {page === "mentions" && i === 0 && identityCard}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
