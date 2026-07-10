import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/types/db";

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  open: () => void;
  close: () => void;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, color?: string, size?: string) => void;
  updateQuantity: (
    productId: string,
    quantity: number,
    color?: string,
    size?: string
  ) => void;
  clear: () => void;
  subtotal: () => number;
  totalQuantity: () => number;
}

function sameLine(
  a: CartItem,
  productId: string,
  color?: string,
  size?: string
) {
  return a.productId === productId && a.color === color && a.size === size;
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
            sameLine(i, item.productId, item.color, item.size)
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                sameLine(i, item.productId, item.color, item.size)
                  ? { ...i, quantity: Math.min(i.quantity + item.quantity, i.stock) }
                  : i
              ),
              isOpen: true,
            };
          }
          return { items: [...state.items, item], isOpen: true };
        }),
      removeItem: (productId, color, size) =>
        set((state) => ({
          items: state.items.filter(
            (i) => !sameLine(i, productId, color, size)
          ),
        })),
      updateQuantity: (productId, quantity, color, size) =>
        set((state) => ({
          items: state.items
            .map((i) =>
              sameLine(i, productId, color, size)
                ? { ...i, quantity: Math.max(1, Math.min(quantity, i.stock)) }
                : i
            )
            .filter((i) => i.quantity > 0),
        })),
      clear: () => set({ items: [] }),
      subtotal: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      totalQuantity: () =>
        get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: "auto-market-cart" }
  )
);
