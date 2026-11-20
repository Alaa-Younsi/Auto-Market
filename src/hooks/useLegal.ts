import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { LEGAL_CONTENT, type LegalPageKey } from "@/content/legal";

export interface LegalPageRow {
  page: LegalPageKey;
  title_fr: string | null;
  title_ar: string | null;
  intro_fr: string | null;
  intro_ar: string | null;
  updated_label_fr: string | null;
  updated_label_ar: string | null;
}

export interface LegalSectionRow {
  id: string;
  page: LegalPageKey;
  builtin_key: string | null;
  sort_order: number;
  active: boolean;
  title_fr: string | null;
  title_ar: string | null;
  body_fr: string | null;
  body_ar: string | null;
}

export interface LegalOverrides {
  page: LegalPageRow | null;
  sections: LegalSectionRow[];
}

export const PAGE_COLUMNS =
  "page,title_fr,title_ar,intro_fr,intro_ar,updated_label_fr,updated_label_ar";
export const SECTION_COLUMNS =
  "id,page,builtin_key,sort_order,active,title_fr,title_ar,body_fr,body_ar";

/**
 * The admin's overrides for one page. A failed read (table missing, network)
 * resolves to "no overrides", so the page still shows the built-in text —
 * a legal page that renders nothing is worse than last week's wording.
 */
export function useLegalOverrides(page: LegalPageKey) {
  return useQuery({
    queryKey: ["legal", page],
    queryFn: async (): Promise<LegalOverrides> => {
      const [p, s] = await Promise.all([
        supabase.from("legal_pages").select(PAGE_COLUMNS).eq("page", page).maybeSingle(),
        supabase
          .from("legal_sections")
          .select(SECTION_COLUMNS)
          .eq("page", page)
          .order("sort_order"),
      ]);
      return {
        page: p.error ? null : ((p.data as LegalPageRow | null) ?? null),
        sections: s.error ? [] : ((s.data as LegalSectionRow[] | null) ?? []),
      };
    },
    staleTime: 10 * 60_000,
    retry: 0,
  });
}

export interface ResolvedSection {
  /** builtin key, or the row id for a section the owner added. */
  id: string;
  title: string;
  body: string;
}

export interface ResolvedLegalPage {
  title: string;
  intro: string;
  updated: string;
  sections: ResolvedSection[];
}

const nz = (v: string | null | undefined) => (v?.trim() ? v : null);

export type LegalVars = Record<"store" | "phone" | "email" | "domain", string>;

export function fillVars(text: string, vars: LegalVars): string {
  return text.replace(/\{(store|phone|email|domain)\}/g, (_, k: keyof LegalVars) => vars[k]);
}

/**
 * Per field, per language: the override in the reader's language → the
 * built-in text in that language → (custom sections only) the French
 * override. Hidden built-ins are dropped; numbering comes from the RENDERED
 * position, so hiding #3 never prints 01, 02, 04.
 */
export function resolveLegal(
  page: LegalPageKey,
  lang: "fr" | "ar",
  overrides: LegalOverrides | undefined,
  vars: LegalVars
): ResolvedLegalPage {
  const builtin = LEGAL_CONTENT[page];
  const row = overrides?.page ?? null;
  const rows = overrides?.sections ?? [];

  const items: (ResolvedSection & { order: number })[] = [];
  builtin.sections.forEach((b, i) => {
    const o = rows.find((r) => r.builtin_key === b.key);
    if (o && !o.active) return;
    items.push({
      id: b.key,
      order: o?.sort_order ?? i * 10,
      title: nz(o?.[`title_${lang}`]) ?? b.title[lang],
      body: nz(o?.[`body_${lang}`]) ?? b.body[lang],
    });
  });
  for (const r of rows) {
    if (r.builtin_key !== null || !r.active) continue;
    const title = nz(r[`title_${lang}`]) ?? nz(r.title_fr) ?? "";
    const body = nz(r[`body_${lang}`]) ?? nz(r.body_fr) ?? "";
    if (!title.trim() && !body.trim()) continue;
    items.push({ id: r.id, order: r.sort_order, title, body });
  }
  items.sort((a, b) => a.order - b.order);

  return {
    title: fillVars(nz(row?.[`title_${lang}`]) ?? builtin.title[lang], vars),
    intro: fillVars(nz(row?.[`intro_${lang}`]) ?? builtin.intro[lang], vars),
    updated: fillVars(nz(row?.[`updated_label_${lang}`]) ?? builtin.updated[lang], vars),
    sections: items.map(({ order: _order, ...s }) => ({
      ...s,
      title: fillVars(s.title, vars),
      body: fillVars(s.body, vars),
    })),
  };
}
