import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { quoteCart } from "@/lib/promotions";
import { useLivePromotions } from "@/hooks/usePromotions";
import type { QuantityOffer } from "@/types/db";

export interface QuoteInput {
  productId: string;
  categoryId?: string | null;
  price: number;
  quantity: number;
  offers?: QuantityOffer[];
}

export interface CartTotals {
  subtotal: number;
  discount: number;
  /** True once the figure came from price_cart (the function place_order uses). */
  confirmed: boolean;
}

/**
 * Cart totals: the TypeScript mirror answers instantly (a quantity stepper
 * never lags), then the server's `price_cart` — the same engine place_order
 * charges with — replaces it as soon as it lands. Prices come from the
 * database on that call, so a stale cached price in the cart is corrected too.
 */
export function useCartQuote(lines: QuoteInput[]): CartTotals {
  const { data: promotions = [] } = useLivePromotions();
  const mirror = quoteCart(
    lines.map((l) => ({
      product_id: l.productId,
      category_id: l.categoryId ?? null,
      unit_price: Number(l.price),
      quantity: l.quantity,
      quantity_offers: l.offers ?? [],
    })),
    promotions
  );

  const items = lines.map((l) => ({ product_id: l.productId, quantity: l.quantity }));
  const key = JSON.stringify(items);
  const { data: server } = useQuery({
    queryKey: ["cart-quote", key],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("price_cart", { items });
      if (error) throw error;
      const d = data as { subtotal: number | string; discount: number | string };
      return { subtotal: Number(d.subtotal), discount: Number(d.discount) };
    },
    enabled: lines.length > 0,
    staleTime: 30_000,
    retry: 0,
    // No placeholderData on purpose: a changed cart must never show the
    // previous cart's server total — the mirror covers the gap.
  });

  if (server && lines.length > 0) {
    return { subtotal: server.subtotal, discount: server.discount, confirmed: true };
  }
  return { subtotal: mirror.subtotal, discount: mirror.discount, confirmed: false };
}
