import { useLanguage } from "@/i18n/LanguageProvider";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { CONTACT_PHONE, CONTACT_PHONE_E164 } from "@/lib/contact";

export interface SocialLink {
  key: "instagram" | "facebook" | "tiktok" | "youtube" | "snapchat";
  label: string;
  href: string;
}

export interface ContactInfo {
  phone: string;
  phoneHref: string;
  whatsappHref: string;
  email: string | null;
  address: string | null;
  hours: string | null;
  socials: SocialLink[];
  legal: {
    name: string | null;
    owner: string | null;
    rc: string | null;
    nif: string | null;
    nis: string | null;
    ai: string | null;
  };
}

/** "+213 555 91 73 33" / "0555917333" → "+213555917333". */
export function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (raw.trim().startsWith("+")) return `+${digits}`;
  if (digits.startsWith("213")) return `+${digits}`;
  return digits.startsWith("0") ? `+213${digits.slice(1)}` : `+${digits}`;
}

/** Only https links ever reach an href (the DB checks it too). */
function safeUrl(v: string | null | undefined): string | null {
  const s = v?.trim();
  return s && /^https:\/\/[^\s"<>]+$/.test(s) ? s : null;
}

const clean = (v: string | null | undefined) => {
  const s = v?.trim();
  return s ? s : null;
};

/**
 * The store's contact + identity, as the client set it in Admin → Réglages.
 * `lib/contact.ts` only holds the fallbacks used before settings load (or
 * before migration 0013 has run), so the footer is never empty.
 */
export function useContact(): ContactInfo {
  const { lang } = useLanguage();
  const { data: s } = useStoreSettings();

  const phone = clean(s?.contact_phone) ?? CONTACT_PHONE;
  const phoneE164 = s?.contact_phone ? toE164(s.contact_phone) : CONTACT_PHONE_E164;
  const whatsappE164 = s?.contact_whatsapp ? toE164(s.contact_whatsapp) : phoneE164;
  const pick = (fr?: string | null, ar?: string | null) =>
    lang === "ar" ? (clean(ar) ?? clean(fr)) : (clean(fr) ?? clean(ar));

  const socials: SocialLink[] = [];
  const add = (key: SocialLink["key"], label: string, v?: string | null) => {
    const href = safeUrl(v);
    if (href) socials.push({ key, label, href });
  };
  add("instagram", "Instagram", s?.social_instagram);
  add("facebook", "Facebook", s?.social_facebook);
  add("tiktok", "TikTok", s?.social_tiktok);
  add("youtube", "YouTube", s?.social_youtube);
  add("snapchat", "Snapchat", s?.social_snapchat);

  return {
    phone,
    phoneHref: `tel:${phoneE164}`,
    whatsappHref: `https://wa.me/${whatsappE164.slice(1)}`,
    email: clean(s?.contact_email),
    address: pick(s?.address_fr, s?.address_ar),
    hours: pick(s?.hours_fr, s?.hours_ar),
    socials,
    legal: {
      name: clean(s?.legal_name),
      owner: clean(s?.legal_owner),
      rc: clean(s?.legal_rc),
      nif: clean(s?.legal_nif),
      nis: clean(s?.legal_nis),
      ai: clean(s?.legal_ai),
    },
  };
}
