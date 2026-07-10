export function formatPrice(value: number): string {
  const rounded = Math.round(value);
  const withSeparators = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${withSeparators} DA`;
}

export function formatDate(iso: string, lang: "fr" | "ar" = "fr"): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-DZ" : "fr-DZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
