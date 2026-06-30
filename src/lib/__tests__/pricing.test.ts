import { describe, it, expect } from "vitest";
import {
  redeemDiscount,
  promoDiscount,
  computeNet,
  earnedPoints,
  rankFor,
  isLowStock,
} from "@/lib/pricing";

describe("redeemDiscount (đổi điểm)", () => {
  it("100 điểm = 10.000đ", () => {
    expect(redeemDiscount(100, 500, 100000)).toBe(10000);
  });
  it("làm tròn xuống bội số 100 điểm", () => {
    expect(redeemDiscount(250, 500, 100000)).toBe(20000); // 200 điểm
  });
  it("không vượt số điểm đang có", () => {
    expect(redeemDiscount(500, 150, 100000)).toBe(10000); // chỉ có 150 -> 100 điểm
  });
  it("không vượt số tiền còn lại (cap)", () => {
    expect(redeemDiscount(1000, 1000, 30000)).toBe(30000);
  });
  it("0 hoặc âm -> 0", () => {
    expect(redeemDiscount(0, 500, 100000)).toBe(0);
    expect(redeemDiscount(-100, 500, 100000)).toBe(0);
  });
});

describe("promoDiscount (voucher)", () => {
  it("giảm % ", () => {
    expect(promoDiscount({ kind: "percent", value: 10, min_total: 0 }, 100000)).toBe(10000);
  });
  it("giảm số tiền cố định", () => {
    expect(promoDiscount({ kind: "amount", value: 20000, min_total: 100000 }, 120000)).toBe(20000);
  });
  it("chưa đạt đơn tối thiểu -> 0", () => {
    expect(promoDiscount({ kind: "amount", value: 20000, min_total: 100000 }, 80000)).toBe(0);
  });
  it("không vượt tổng tiền", () => {
    expect(promoDiscount({ kind: "amount", value: 999999, min_total: 0 }, 50000)).toBe(50000);
  });
  it("null -> 0", () => {
    expect(promoDiscount(null, 100000)).toBe(0);
  });
});

describe("computeNet (voucher + đổi điểm)", () => {
  it("áp voucher rồi đổi điểm, không âm", () => {
    const r = computeNet(100000, { kind: "percent", value: 10, min_total: 0 }, 500, 1000);
    expect(r.promo).toBe(10000); // -10%
    expect(r.redeem).toBe(50000); // 500 điểm = 50k (<= 90k còn lại)
    expect(r.net).toBe(40000);
  });
  it("đổi điểm bị chặn bởi số tiền còn lại sau voucher", () => {
    const r = computeNet(30000, { kind: "amount", value: 20000, min_total: 0 }, 1000, 1000);
    expect(r.promo).toBe(20000);
    expect(r.redeem).toBe(10000); // còn 10k
    expect(r.net).toBe(0);
  });
});

describe("earnedPoints & rankFor", () => {
  it("1 điểm / 10.000đ", () => {
    expect(earnedPoints(45000)).toBe(4);
    expect(earnedPoints(9999)).toBe(0);
  });
  it("xếp hạng theo chi tiêu", () => {
    expect(rankFor(2_500_000)).toBe("VIP");
    expect(rankFor(1_200_000)).toBe("Thân thiết");
    expect(rankFor(500_000)).toBe("Mới");
  });
});

describe("isLowStock (cảnh báo tồn kho)", () => {
  it("dưới ngưỡng", () => {
    expect(isLowStock(50, 100)).toBe(true);
  });
  it("đủ ngưỡng", () => {
    expect(isLowStock(100, 100)).toBe(false);
    expect(isLowStock(200, 100)).toBe(false);
  });
});
