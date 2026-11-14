import { useQuery } from "@tanstack/react-query";

export interface Commune {
  fr: string;
  ar: string;
}

interface CommunesFile {
  wilayas: Record<string, { fr: string; ar: string; communes: [string, string][] }>;
}

/** Accent/punctuation-blind key, so "Bordj Bou Arréridj" matches "Bordj Bou Arreridj". */
function norm(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

/** delivery_prices spellings that differ from the dataset beyond accents. */
const ALIASES: Record<string, string> = {
  [norm("Aïn Oussera")]: norm("Aïn Ouessara"),
};

async function loadIndex(): Promise<Map<string, Commune[]>> {
  // Code-split: ~19 KB gzipped, fetched only once a checkout form is on screen.
  const data = ((await import("@/data/communes.json")) as { default: CommunesFile }).default;
  const index = new Map<string, Commune[]>();
  for (const w of Object.values(data.wilayas)) {
    index.set(
      norm(w.fr),
      w.communes.map(([fr, ar]) => ({ fr, ar }))
    );
  }
  return index;
}

/**
 * The communes (baladiyat) of one wilaya, by its delivery_prices name.
 * Returns `null` when the wilaya isn't in the dataset — the form then falls
 * back to a free-text field rather than blocking the order.
 */
export function useCommunes(wilaya: string | undefined) {
  const query = useQuery({
    queryKey: ["communes-index"],
    queryFn: loadIndex,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });
  if (!wilaya || !query.data) return { communes: null, isLoading: query.isLoading };
  const key = norm(wilaya);
  return { communes: query.data.get(ALIASES[key] ?? key) ?? null, isLoading: false };
}
