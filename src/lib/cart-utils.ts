// Kiểu & hàm tính giỏ hàng THUẦN (tách khỏi store zustand để dễ kiểm thử)

export type CartItem = {
  key: string; // variantId nếu có, không thì productId
  productId: string;
  variantId: string | null;
  name: string;
  label: string | null; // tên size
  price: number;
  qty: number;
};

export const cartList = (items: Record<string, CartItem>) => Object.values(items);
export const cartCount = (items: Record<string, CartItem>) =>
  cartList(items).reduce((t, i) => t + i.qty, 0);
export const cartTotal = (items: Record<string, CartItem>) =>
  cartList(items).reduce((t, i) => t + i.qty * i.price, 0);
