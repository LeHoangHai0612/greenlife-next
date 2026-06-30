"use client";

import { useEffect, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, ShoppingBag, X } from "lucide-react";
import { cartCount, cartList, cartTotal, useCart } from "@/lib/store/cart";
import { placeOrderAction, type CheckoutResult } from "@/app/thuc-don/actions";
import { formatVnd } from "@/lib/utils";

const PAYMENTS = ["Tiền mặt", "QR VNPay", "Momo", "ZaloPay"];

export function CartBar() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [payment, setPayment] = useState(PAYMENTS[0]);
  const [promo, setPromo] = useState("");
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const [pending, startTransition] = useTransition();

  const items = useCart((s) => s.items);
  const changeQty = useCart((s) => s.changeQty);
  const clear = useCart((s) => s.clear);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const list = cartList(items);
  const count = cartCount(items);
  const total = cartTotal(items);

  function checkout() {
    setResult(null);
    startTransition(async () => {
      const res = await placeOrderAction({
        items: list.map((i) => ({ product_id: i.productId, qty: i.qty, variant_id: i.variantId })),
        payment,
        promoCode: promo.trim() || null,
      });
      setResult(res);
      if (res.ok) {
        clear();
        setPromo("");
      }
    });
  }

  return (
    <>
      <AnimatePresence>
        {count > 0 && !open && (
          <motion.button
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            onClick={() => {
              setResult(null);
              setOpen(true);
            }}
            className="fixed bottom-5 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 items-center gap-3 rounded-full bg-foreground px-6 py-4 text-background shadow-2xl"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-background text-xs font-semibold text-foreground">
              {count}
            </span>
            <ShoppingBag className="h-4 w-4" />
            <span className="text-[12px] uppercase tracking-[0.15em]">Xem giỏ hàng</span>
            <span className="ml-auto font-display text-xl font-bold">{formatVnd(total)}</span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="max-h-[86vh] w-full max-w-xl overflow-auto rounded-t-3xl bg-paper p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-2xl font-semibold">Giỏ hàng</h3>
                <button aria-label="Đóng" onClick={() => setOpen(false)}>
                  <X className="h-6 w-6" />
                </button>
              </div>

              {result?.ok ? (
                <div className="py-8 text-center">
                  <div className="text-5xl">✅</div>
                  <p className="mt-3 font-display text-xl font-semibold">
                    Đặt hàng thành công · {result.code}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Tổng {formatVnd(result.total)}
                    {result.logged_in ? ` · +${result.earned} điểm` : " · (đăng nhập để tích điểm)"}
                  </p>
                  {result.low_stock?.length > 0 && (
                    <p className="mt-2 text-xs text-amber-700">
                      ⚠️ Nguyên liệu sắp hết: {result.low_stock.map((l) => l.name).join(", ")}
                    </p>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="mt-6 rounded-full bg-foreground px-7 py-3 text-[12px] uppercase tracking-[0.15em] text-background"
                  >
                    Xong
                  </button>
                </div>
              ) : (
                <>
                  {list.length === 0 ? (
                    <p className="py-10 text-center text-sm text-muted-foreground">Giỏ trống</p>
                  ) : (
                    <>
                      {list.map((it) => (
                        <div key={it.key} className="flex items-center gap-3 border-b border-border py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <button onClick={() => changeQty(it.key, -1)} className="flex h-7 w-7 items-center justify-center rounded-full border border-border">
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-5 text-center">{it.qty}</span>
                            <button onClick={() => changeQty(it.key, 1)} className="flex h-7 w-7 items-center justify-center rounded-full border border-border">
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <span className="flex-1">
                            {it.name}
                            {it.label && <span className="text-muted-foreground"> · {it.label.split(" ")[0]}</span>}
                          </span>
                          <span className="text-primary">{formatVnd(it.price * it.qty)}</span>
                        </div>
                      ))}

                      <input
                        value={promo}
                        onChange={(e) => setPromo(e.target.value)}
                        placeholder="Mã giảm giá (vd WELCOME10)"
                        className="mt-4 w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-sm uppercase outline-none focus:border-primary"
                      />

                      <div className="my-4 flex items-baseline justify-between">
                        <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Tạm tính</span>
                        <span className="font-display text-3xl font-bold">{formatVnd(total)}</span>
                      </div>

                      <select
                        value={payment}
                        onChange={(e) => setPayment(e.target.value)}
                        className="w-full rounded-xl border border-border bg-paper p-3 text-sm"
                      >
                        {PAYMENTS.map((p) => (
                          <option key={p}>{p}</option>
                        ))}
                      </select>

                      {result && !result.ok && (
                        <p className="mt-3 text-center text-sm text-red-600">{result.error}</p>
                      )}

                      <button
                        disabled={pending}
                        onClick={checkout}
                        className="mt-4 w-full rounded-full bg-foreground py-4 text-[12px] uppercase tracking-[0.2em] text-background disabled:opacity-60"
                      >
                        {pending ? "Đang xử lý…" : "Đặt hàng"}
                      </button>
                      <p className="mt-2 text-center text-[11px] text-muted-foreground">
                        Đăng nhập trước khi đặt để được tích điểm. Mã giảm giá áp ở bước xác nhận.
                      </p>
                    </>
                  )}
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
