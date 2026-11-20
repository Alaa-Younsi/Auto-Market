import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, SelectedVariant } from "@/types/db";

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  open: () => void;
  close: () => void;
  addItem: (item: CartItem) => void;
  removeItem: (
    productId: string,
    color?: string,
    size?: string,
    variants?: SelectedVariant[]
  ) => void;
  updateQuantity: (
    productId: string,
    quantity: number,
    color?: string,
    size?: string,
    variants?: SelectedVariant[]
  ) => void;
  clear: () => void;
  totalQuantity: () => number;
}

/** Per-line ceiling. Matches the product page stepper (and stays under the
    RPC hard cap of 20), so the cart can never build a line the server refuses. */
export const MAX_LINE_QTY = 10;

function lineCap(stock: number) {
  return Math.max(1, Math.min(stock, MAX_LINE_QTY));
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
                  ? { ...i, quantity: Math.min(i.quantity + item.quantity, lineCap(i.stock)) }
                  : i
              ),
              isOpen: true,
            };
          }
          return {
            items: [
              ...state.items,
              { ...item, quantity: Math.min(item.quantity, lineCap(item.stock)) },
            ],
            isOpen: true,
          };
        }),
      removeItem: (productId, color, size, variants) =>
        set((state) => ({
          items: state.items.filter((i) => !sameLine(i, productId, color, size, variants)),
        })),
      updateQuantity: (productId, quantity, color, size, variants) =>
        set((state) => ({
          items: state.items
            .map((i) =>
              sameLine(i, productId, color, size, variants)
                ? { ...i, quantity: Math.max(1, Math.min(quantity, lineCap(i.stock))) }
                : i
            )
            .filter((i) => i.quantity > 0),
        })),
      clear: () => set({ items: [] }),
      totalQuantity: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      name: "auto-market-cart",
      // Only the lines persist — persisting isOpen re-opened the drawer on every reload.
      partialize: (state) => ({ items: state.items }),
      // v2: the demo catalogue was retired at launch, so a cart saved before it
      // holds products the server now rejects. Start returning visitors fresh.
      version: 2,
      migrate: () => ({ items: [] }),
    }
  )
);
