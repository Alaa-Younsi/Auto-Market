import { create } from "zustand";
import { persist } from "zustand/middleware";
import { lineDiscount } from "@/lib/offers";
import type { CartItem, SelectedVariant } from "@/types/db";

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  open: () => void;
  close: () => void;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, color?: string, size?: string, variants?: SelectedVariant[]) => void;
  updateQuantity: (
    productId: string,
    quantity: number,
    color?: string,
    size?: string,
    variants?: SelectedVariant[]
  ) => void;
  clear: () => void;
  subtotal: () => number;
  discount: () => number;
  totalQuantity: () => number;
}

/** Order-independent so two picks of the same values in a different order
    still merge into the same cart line. */
function variantsKey(variants?: SelectedVariant[]) {
  if (!variants || variants.length === 0) return "";
  return variants
    .map((v) => `${v.name_fr}:${v.value}`)
    .sort()
    .join("|");
}

function sameLine(
  a: CartItem,
  productId: string,
  color?: string,
  size?: string,
  variants?: SelectedVariant[]
) {
  return (
    a.productId === productId &&
    a.color === color &&
    a.size === size &&
    variantsKey(a.variants) === variantsKey(variants)
  );
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) =>
            sameLine(i, item.productId, item.color, item.size, item.variants)
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                sameLine(i, item.productId, item.color, item.size, item.variants)
                  ? { ...i, quantity: Math.min(i.quantity + item.quantity, i.stock) }
                  : i
              ),
              isOpen: true,
            };
          }
          return { items: [...state.items, item], isOpen: true };
        }),
      removeItem: (productId, color, size, variants) =>
        set((state) => ({
          items: state.items.filter(
            (i) => !sameLine(i, productId, color, size, variants)
          ),
        })),
      updateQuantity: (productId, quantity, color, size, variants) =>
        set((state) => ({
          items: state.items
            .map((i) =>
              sameLine(i, productId, color, size, variants)
                ? { ...i, quantity: Math.max(1, Math.min(quantity, i.stock)) }
                : i
            )
            .filter((i) => i.quantity > 0),
        })),
      clear: () => set({ items: [] }),
      subtotal: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      discount: () =>
        get().items.reduce(
          (sum, i) => sum + lineDiscount(i.price, i.quantity, i.offers),
          0
        ),
      totalQuantity: () =>
        get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: "auto-market-cart" }
  )
);
