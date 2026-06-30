import { describe, it, expect } from "vitest";
import { cartCount, cartTotal, cartList, type CartItem } from "@/lib/cart-utils";

const items: Record<string, CartItem> = {
  a: { key: "a", productId: "p1", variantId: null, name: "Trà", label: null, price: 35000, qty: 2 },
  b: { key: "b", productId: "p2", variantId: "v1", name: "Kombucha", label: "L (lớn)", price: 53000, qty: 1 },
};

describe("giỏ hàng", () => {
  it("đếm số lượng món", () => {
    expect(cartCount(items)).toBe(3);
  });
  it("tính tổng tiền", () => {
    expect(cartTotal(items)).toBe(35000 * 2 + 53000);
  });
  it("liệt kê", () => {
    expect(cartList(items)).toHaveLength(2);
  });
  it("giỏ rỗng", () => {
    expect(cartCount({})).toBe(0);
    expect(cartTotal({})).toBe(0);
  });
});
