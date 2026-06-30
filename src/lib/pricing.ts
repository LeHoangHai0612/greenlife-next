// Logic tính giá / điểm / hạng — THUẦN (không phụ thuộc DB), phản chiếu RPC place_order.
// Tách riêng để vừa kiểm thử (unit test) vừa dùng xem trước ở client cho nhất quán.

export type Promo = {
  kind: "percent" | "amount";
  value: number;
  min_total: number;
} | null;

/** Giảm giá từ đổi điểm: bội số 100 điểm = 10.000đ, không vượt số tiền còn lại. */
export function redeemDiscount(redeemPoints: number, availablePoints: number, cap: number): number {
  if (redeemPoints <= 0) return 0;
  const usable = Math.min(
    Math.floor(redeemPoints / 100) * 100,
    Math.floor(availablePoints / 100) * 100,
  );
  return Math.max(0, Math.min(Math.floor(usable / 100) * 10000, cap));
}

/** Giảm giá từ voucher: % hoặc số tiền, chỉ khi đạt đơn tối thiểu, không vượt tổng. */
export function promoDiscount(promo: Promo, subtotal: number): number {
  if (!promo || subtotal < promo.min_total) return 0;
  const d = promo.kind === "percent" ? Math.floor((subtotal * promo.value) / 100) : promo.value;
  return Math.max(0, Math.min(d, subtotal));
}

/** Tổng tiền phải trả sau khi áp voucher rồi tới đổi điểm (không âm). */
export function computeNet(
  subtotal: number,
  promo: Promo,
  redeemPoints: number,
  availablePoints: number,
): { promo: number; redeem: number; net: number } {
  const pd = promoDiscount(promo, subtotal);
  const rd = redeemDiscount(redeemPoints, availablePoints, subtotal - pd);
  return { promo: pd, redeem: rd, net: Math.max(0, subtotal - pd - rd) };
}

/** Điểm tích lũy: 1 điểm / 10.000đ trên số tiền thực trả. */
export function earnedPoints(net: number): number {
  return Math.floor(net / 10000);
}

/** Hạng theo tổng chi tiêu. */
export function rankFor(totalSpend: number): "VIP" | "Thân thiết" | "Mới" {
  if (totalSpend >= 2_000_000) return "VIP";
  if (totalSpend >= 1_000_000) return "Thân thiết";
  return "Mới";
}

/** Nguyên liệu dưới ngưỡng cảnh báo. */
export function isLowStock(stock: number, minStock: number): boolean {
  return Number(stock) < Number(minStock);
}
