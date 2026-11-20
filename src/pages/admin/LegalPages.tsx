import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ExternalLink,
  Eye,
  EyeOff,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";
import type { TranslationKey } from "@/i18n/translations";
import { type LegalSectionRow, type LegalPageRow, useLegalOverrides } from "@/hooks/useLegal";
import { LEGAL_CONTENT, LEGAL_PAGES, type LegalPageKey } from "@/content/legal";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Field } from "@/components/admin/Field";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

const NAV_KEY: Record<LegalPageKey, TranslationKey> = {
  policy: "legal_nav_policy",
  mentions: "legal_nav_mentions",
  cgv: "legal_nav_cgv",
  privacy: "legal_nav_privacy",
  cookies: "legal_nav_cookies",
};

type Lang2 = "fr" | "ar";
type Texts = Record<"title_fr" | "title_ar" | "body_fr" | "body_ar", string>;

interface EditSection extends Texts {
  /** Stable React key. */
  uid: string;
  dbId: string | null;
  builtinKey: string | null;
  active: boolean;
}

type PageTexts = Record<
  "title_fr" | "title_ar" | "intro_fr" | "intro_ar" | "updated_label_fr" | "updated_label_ar",
  string
>;

const orNull = (v: string) => (v.trim() === "" ? null : v.trim());

function buildState(page: LegalPageKey, rows: LegalSectionRow[], pageRow: LegalPageRow | null) {
  const builtin = LEGAL_CONTENT[page].sections;
  const items: (EditSection & { order: number })[] = builtin.map((b, i) => {
    const r = rows.find((x) => x.builtin_key === b.key);
    return {
      uid: b.key,
      dbId: r?.id ?? null,
      builtinKey: b.key,
      active: r?.active ?? true,
      order: r?.sort_order ?? i * 10,
      title_fr: r?.title_fr ?? "",
      title_ar: r?.title_ar ?? "",
      body_fr: r?.body_fr ?? "",
      body_ar: r?.body_ar ?? "",
    };
  });
  for (const r of rows) {
    if (r.builtin_key) continue;
    items.push({
      uid: r.id,
      dbId: r.id,
      builtinKey: null,
      active: r.active,
      order: r.sort_order,
      title_fr: r.title_fr ?? "",
      title_ar: r.title_ar ?? "",
      body_fr: r.body_fr ?? "",
      body_ar: r.body_ar ?? "",
    });
  }
  items.sort((a, b) => a.order - b.order);
  const pageTexts: PageTexts = {
    title_fr: pageRow?.title_fr ?? "",
    title_ar: pageRow?.title_ar ?? "",
    intro_fr: pageRow?.intro_fr ?? "",
    intro_ar: pageRow?.intro_ar ?? "",
    updated_label_fr: pageRow?.updated_label_fr ?? "",
    updated_label_ar: pageRow?.updated_label_ar ?? "",
  };
  return { sections: items.map(({ order: _o, ...s }) => s), pageTexts };
}

function PageEditor({
  page,
  rows,
  pageRow,
  onSaved,
  onDirty,
}: {
  page: LegalPageKey;
  rows: LegalSectionRow[];
  pageRow: LegalPageRow | null;
  onSaved: (ok: boolean, key: TranslationKey) => void;
  onDirty: (dirty: boolean) => void;
}) {
  const { t } = useLanguage();
  const builtin = LEGAL_CONTENT[page];
  const [state, setState] = useState(() => buildState(page, rows, pageRow));
  const [openUid, setOpenUid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toRemove, setToRemove] = useState<EditSection | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const update = (fn: (s: typeof state) => typeof state) => {
    setState(fn);
    onDirty(true);
  };
  const setSection = (uid: string, patch: Partial<EditSection>) =>
    update((s) => ({
      ...s,
      sections: s.sections.map((x) => (x.uid === uid ? { ...x, ...patch } : x)),
    }));
  const move = (index: number, delta: number) =>
    update((s) => {
      const next = [...s.sections];
      const [item] = next.splice(index, 1);
      next.splice(index + delta, 0, item);
      return { ...s, sections: next };
    });

  const invalid = state.sections.find(
    (s) => s.builtinKey === null && (!s.title_fr.trim() || !s.body_fr.trim())
  );

  function addSection() {
    const uid = `new-${crypto.randomUUID()}`;
    update((s) => ({
      ...s,
      sections: [
        ...s.sections,
        {
          uid,
          dbId: null,
          builtinKey: null,
          active: true,
          title_fr: "",
          title_ar: "",
          body_fr: "",
          body_ar: "",
        },
      ],
    }));
    setOpenUid(uid);
  }

  async function removeCustom() {
    if (!toRemove) return;
    if (toRemove.dbId) {
      setRemoving(true);
      setRemoveError(null);
      const { data, error } = await supabase
        .from("legal_sections")
        .delete()
        .eq("id", toRemove.dbId)
        .select("id");
      setRemoving(false);
      if (error || !data?.length) {
        setRemoveError(t("admin_delete_error"));
        return;
      }
    }
    const uid = toRemove.uid;
    setState((s) => ({ ...s, sections: s.sections.filter((x) => x.uid !== uid) }));
    setToRemove(null);
  }

  async function save() {
    if (invalid) return;
    setBusy(true);
    const pageTexts = state.pageTexts;
    const pagePayload = {
      page,
      title_fr: orNull(pageTexts.title_fr),
      title_ar: orNull(pageTexts.title_ar),
      intro_fr: orNull(pageTexts.intro_fr),
      intro_ar: orNull(pageTexts.intro_ar),
      updated_label_fr: orNull(pageTexts.updated_label_fr),
      updated_label_ar: orNull(pageTexts.updated_label_ar),
    };
    const toRow = (s: EditSection, i: number) => ({
      page,
      builtin_key: s.builtinKey,
      sort_order: i * 10,
      active: s.active,
      title_fr: orNull(s.title_fr),
      title_ar: orNull(s.title_ar),
      body_fr: orNull(s.body_fr),
      body_ar: orNull(s.body_ar),
    });
    const indexed = state.sections.map((s, i) => ({ s, row: toRow(s, i) }));
    const builtins = indexed.filter((x) => x.s.builtinKey).map((x) => x.row);
    const existing = indexed.filter((x) => !x.s.builtinKey && x.s.dbId);
    const created = indexed.filter((x) => !x.s.builtinKey && !x.s.dbId).map((x) => x.row);

    const results = await Promise.all([
      supabase.from("legal_pages").upsert(pagePayload, { onConflict: "page" }).select("page"),
      builtins.length
        ? supabase
            .from("legal_sections")
            .upsert(builtins, { onConflict: "builtin_key" })
            .select("id")
        : Promise.resolve({ data: [], error: null }),
      created.length
        ? supabase.from("legal_sections").insert(created).select("id")
        : Promise.resolve({ data: [], error: null }),
      ...existing.map((x) =>
        supabase
          .from("legal_sections")
          .update(x.row)
          .eq("id", x.s.dbId as string)
          .select("id")
      ),
    ]);
    setBusy(false);
    const failed = results.some((r) => r.error || !r.data);
    onDirty(failed);
    onSaved(!failed, failed ? "admin_save_error" : "legal_saved");
  }

  const pageField = (k: keyof PageTexts, lang: Lang2, label: TranslationKey, multiline = false) => {
    const base = k.replace(/_(fr|ar)$/, "") as "title" | "intro" | "updated_label";
    const placeholder =
      base === "title"
        ? builtin.title[lang]
        : base === "intro"
          ? builtin.intro[lang]
          : builtin.updated[lang];
    const common = {
      dir: lang === "ar" ? ("rtl" as const) : ("ltr" as const),
      value: state.pageTexts[k],
      placeholder,
      onChange: (e: { target: { value: string } }) =>
        update((s) => ({ ...s, pageTexts: { ...s.pageTexts, [k]: e.target.value } })),
    };
    return (
      <Field label={`${t(label)} (${lang.toUpperCase()})`}>
        {multiline ? (
          <Textarea rows={3} maxLength={1500} {...common} />
        ) : (
          <Input maxLength={120} {...common} />
        )}
      </Field>
    );
  };

  return (
    <div className="space-y-5 pb-24">
      <section className="rounded-2xl border border-line bg-panel p-4 shadow-card sm:p-5">
        <h2 className="font-heading text-base font-bold text-ink">{t("legal_page_header")}</h2>
        <p className="mt-1 text-xs text-muted">{t("legal_placeholder_hint")}</p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {pageField("title_fr", "fr", "legal_field_title")}
          {pageField("title_ar", "ar", "legal_field_title")}
          {pageField("intro_fr", "fr", "legal_field_intro", true)}
          {pageField("intro_ar", "ar", "legal_field_intro", true)}
          {pageField("updated_label_fr", "fr", "legal_field_updated")}
          {pageField("updated_label_ar", "ar", "legal_field_updated")}
        </div>
      </section>

      <ol className="space-y-3">
        {state.sections.map((s, i) => {
          const b = builtin.sections.find((x) => x.key === s.builtinKey);
          const open = openUid === s.uid;
          const heading = (s.title_fr.trim() || b?.title.fr) ?? t("legal_new_section");
          const overridden = !!(s.title_fr || s.title_ar || s.body_fr || s.body_ar);
          return (
            <li
              key={s.uid}
              className={cn(
                "rounded-2xl border bg-panel shadow-card",
                s.active ? "border-line" : "border-dashed border-line opacity-70"
              )}
            >
              <div className="flex items-center gap-1.5 p-2.5 sm:gap-2 sm:p-3">
                <button
                  type="button"
                  onClick={() => setOpenUid(open ? null : s.uid)}
                  aria-expanded={open}
                  className="flex min-w-0 flex-1 items-center gap-2 text-start"
                >
                  <span className="font-mono text-xs text-brand">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="truncate text-sm font-semibold text-ink">{heading}</span>
                  {s.builtinKey === null && (
                    <span className="shrink-0 rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand">
                      {t("legal_custom")}
                    </span>
                  )}
                  {s.builtinKey !== null && overridden && (
                    <span className="hidden shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent sm:inline">
                      {t("legal_edited")}
                    </span>
                  )}
                  <ChevronDown
                    size={16}
                    className={cn(
                      "ms-auto shrink-0 text-muted transition-transform",
                      open && "rotate-180"
                    )}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="rounded-lg p-1.5 text-muted hover:bg-panel-2 hover:text-ink disabled:opacity-30"
                  aria-label={t("legal_move_up")}
                >
                  <ArrowUp size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === state.sections.length - 1}
                  className="rounded-lg p-1.5 text-muted hover:bg-panel-2 hover:text-ink disabled:opacity-30"
                  aria-label={t("legal_move_down")}
                >
                  <ArrowDown size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setSection(s.uid, { active: !s.active })}
                  className="rounded-lg p-1.5 text-muted hover:bg-panel-2 hover:text-ink"
                  aria-label={s.active ? t("legal_hide") : t("legal_show")}
                  aria-pressed={!s.active}
                  title={s.active ? t("legal_hide") : t("legal_show")}
                >
                  {s.active ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
              </div>

              {open && (
                <div className="space-y-4 border-t border-line p-3 sm:p-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {(["fr", "ar"] as const).map((lang) => (
                      <div key={lang} className="space-y-3">
                        <Field label={`${t("legal_field_title")} (${lang.toUpperCase()})`}>
                          <Input
                            dir={lang === "ar" ? "rtl" : "ltr"}
                            maxLength={120}
                            value={s[`title_${lang}`]}
                            placeholder={b?.title[lang] ?? ""}
                            onChange={(e) =>
                              setSection(s.uid, { [`title_${lang}`]: e.target.value })
                            }
                            error={
                              s.builtinKey === null && lang === "fr" && !s.title_fr.trim()
                                ? t("legal_custom_needs_fr")
                                : undefined
                            }
                          />
                        </Field>
                        <Field label={`${t("legal_field_body")} (${lang.toUpperCase()})`}>
                          <Textarea
                            dir={lang === "ar" ? "rtl" : "ltr"}
                            rows={9}
                            maxLength={6000}
                            value={s[`body_${lang}`]}
                            placeholder={b?.body[lang] ?? ""}
                            onChange={(e) =>
                              setSection(s.uid, { [`body_${lang}`]: e.target.value })
                            }
                            error={
                              s.builtinKey === null && lang === "fr" && !s.body_fr.trim()
                                ? t("legal_custom_needs_fr")
                                : undefined
                            }
                          />
                        </Field>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted">{t("legal_format_hint")}</p>
                  <div className="flex flex-wrap gap-2">
                    {s.builtinKey !== null ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={!overridden}
                        onClick={() =>
                          setSection(s.uid, {
                            title_fr: "",
                            title_ar: "",
                            body_fr: "",
                            body_ar: "",
                          })
                        }
                      >
                        <RotateCcw size={14} />
                        {t("legal_restore")}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          setRemoveError(null);
                          setToRemove(s);
                        }}
                      >
                        <Trash2 size={14} />
                        {t("legal_delete_section")}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <Button type="button" variant="secondary" onClick={addSection}>
        <Plus size={16} />
        {t("legal_add_section")}
      </Button>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-2 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:flex-row sm:items-center sm:justify-end sm:px-6 lg:-mx-8 lg:px-8">
        {invalid && <p className="text-sm text-red-500">{t("legal_custom_needs_fr")}</p>}
        <Button type="button" onClick={save} disabled={busy || !!invalid} className="sm:min-w-40">
          <Save size={16} />
          {busy ? "…" : t("admin_save")}
        </Button>
      </div>

      <ConfirmDialog
        open={toRemove !== null}
        title={t("legal_delete_section")}
        confirmLabel={t("admin_delete")}
        busy={removing}
        error={removeError}
        onConfirm={removeCustom}
        onClose={() => setToRemove(null)}
      >
        <p>{toRemove?.title_fr || t("legal_new_section")}</p>
      </ConfirmDialog>
    </div>
  );
}

export default function AdminLegalPages() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [page, setPage] = useState<LegalPageKey>("policy");
  const [pendingPage, setPendingPage] = useState<LegalPageKey | null>(null);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; key: TranslationKey } | null>(null);
  const { data, isLoading, dataUpdatedAt } = useLegalOverrides(page);
  const path = LEGAL_PAGES.find((p) => p.key === page)?.path ?? "/";

  // The storefront hook swallows errors (it falls back to the built-in text);
  // the editor must not silently start from a table that isn't there.
  const { data: missing } = useQuery({
    queryKey: ["legal-table-probe"],
    queryFn: async () => {
      const { error } = await supabase.from("legal_pages").select("page").limit(1);
      return !!error;
    },
    retry: 0,
  });

  function switchTo(next: LegalPageKey) {
    if (next === page) return;
    if (dirty) {
      setPendingPage(next);
      return;
    }
    setStatus(null);
    setPage(next);
  }

  return (
    <div className="max-w-5xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">
            {t("legal_admin_title")}
          </h1>
          <p className="mt-1 text-sm text-muted">{t("legal_admin_intro")}</p>
        </div>
        <a
          href={path}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
        >
          <ExternalLink size={15} />
          {t("legal_view_page")}
        </a>
      </div>

      <div className="-mx-4 mt-5 mb-5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div role="tablist" className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
          {LEGAL_PAGES.map((p) => (
            <button
              key={p.key}
              type="button"
              role="tab"
              aria-selected={p.key === page}
              onClick={() => switchTo(p.key)}
              className={cn(
                "whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
                p.key === page
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-line text-muted hover:border-brand/50 hover:text-ink"
              )}
            >
              {t(NAV_KEY[p.key])}
            </button>
          ))}
        </div>
      </div>

      {missing && (
        <p className="mb-4 rounded-xl bg-amber-400/10 px-3 py-2 text-sm text-amber-500">
          {t("settings_missing_migration")}
        </p>
      )}
      {status && (
        <p
          role="status"
          className={cn(
            "mb-4 rounded-xl px-3 py-2 text-sm",
            status.ok ? "bg-accent/10 text-accent" : "bg-red-500/10 text-red-500"
          )}
        >
          {t(status.key)}
        </p>
      )}

      {isLoading ? (
        <p className="text-muted">{t("loading")}</p>
      ) : (
        <PageEditor
          key={`${page}-${dataUpdatedAt}`}
          page={page}
          rows={data?.sections ?? []}
          pageRow={data?.page ?? null}
          onDirty={setDirty}
          onSaved={(ok, key) => {
            setStatus({ ok, key });
            if (ok) qc.invalidateQueries({ queryKey: ["legal", page] });
          }}
        />
      )}

      <ConfirmDialog
        open={pendingPage !== null}
        title={t("legal_unsaved_title")}
        confirmLabel={t("legal_discard")}
        onConfirm={() => {
          if (pendingPage) setPage(pendingPage);
          setPendingPage(null);
          setDirty(false);
          setStatus(null);
        }}
        onClose={() => setPendingPage(null)}
      >
        <p>{t("legal_unsaved_body")}</p>
      </ConfirmDialog>
    </div>
  );
}
