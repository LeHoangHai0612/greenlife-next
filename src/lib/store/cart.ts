import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  key: string; // variantId nếu có, không thì productId
  productId: string;
  variantId: string | null;
  name: string;
  label: string | null; // tên size
  price: number;
  qty: number;
};

type AddArg = {
  productId: string;
  variantId: string | null;
  name: string;
  label?: string | null;
  price: number;
};

type CartState = {
  items: Record<string, CartItem>;
  add: (p: AddArg) => void;
  changeQty: (key: string, delta: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: {},
      add: (p) =>
        set((s) => {
          const key = p.variantId ?? p.productId;
          const cur = s.items[key];
          return {
            items: {
              ...s.items,
              [key]: {
                key,
                productId: p.productId,
                variantId: p.variantId,
                name: p.name,
                label: p.label ?? null,
                price: p.price,
                qty: (cur?.qty ?? 0) + 1,
              },
            },
          };
        }),
      changeQty: (key, delta) =>
        set((s) => {
          const cur = s.items[key];
          if (!cur) return s;
          const qty = cur.qty + delta;
          const items = { ...s.items };
          if (qty <= 0) delete items[key];
          else items[key] = { ...cur, qty };
          return { items };
        }),
      remove: (key) =>
        set((s) => {
          const items = { ...s.items };
          delete items[key];
          return { items };
        }),
      clear: () => set({ items: {} }),
    }),
    { name: "greenlife-cart-v2" },
  ),
);

export const cartList = (items: Record<string, CartItem>) => Object.values(items);
export const cartCount = (items: Record<string, CartItem>) =>
  cartList(items).reduce((t, i) => t + i.qty, 0);
export const cartTotal = (items: Record<string, CartItem>) =>
  cartList(items).reduce((t, i) => t + i.qty * i.price, 0);
