/**
 * The store's contact details — the ONLY place they are written. Footer,
 * admin WhatsApp links and anything else import from here, so changing the
 * number is a one-line edit that cannot leave a stale copy behind.
 * Not translated on purpose: a phone number is the same in every language.
 */
export const CONTACT_PHONE = "+213 555 91 73 33";
/** E.164 — a local-format tel: link silently does nothing on many phones. */
export const CONTACT_PHONE_E164 = "+213555917333";
export const CONTACT_PHONE_HREF = `tel:${CONTACT_PHONE_E164}`;
export const CONTACT_WHATSAPP_HREF = `https://wa.me/${CONTACT_PHONE_E164.slice(1)}`;

/**
 * Algerian mobile in local form (0XXXXXXXXX, what checkout stores) →
 * international digits for wa.me / tel: links.
 */
export function dzPhoneToIntl(local: string): string {
  const digits = local.replace(/\D/g, "");
  if (digits.startsWith("213")) return digits;
  return digits.startsWith("0") ? `213${digits.slice(1)}` : digits;
}
