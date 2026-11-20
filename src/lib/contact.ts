/**
 * FALLBACK contact details. The live values are edited by the client in
 * Admin → Réglages (store_settings) and read through `useContact()`; these are
 * only shown before the settings load, or if that row is ever unreadable.
 * Not translated on purpose: a phone number is the same in every language.
 */
export const CONTACT_PHONE = "+213 555 91 73 33";
/** E.164 — a local-format tel: link silently does nothing on many phones. */
export const CONTACT_PHONE_E164 = "+213555917333";

/**
 * Algerian mobile in local form (0XXXXXXXXX, what checkout stores) →
 * international digits for wa.me / tel: links.
 */
export function dzPhoneToIntl(local: string): string {
  const digits = local.replace(/\D/g, "");
  if (digits.startsWith("213")) return digits;
  return digits.startsWith("0") ? `213${digits.slice(1)}` : digits;
}
