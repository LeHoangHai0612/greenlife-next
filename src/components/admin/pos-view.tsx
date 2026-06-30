"use client";

import { useMemo, useState, useTransition } from "react";
import { Minus, Plus, Search, X, UserCheck } from "lucide-react";
import { CATEGORY_EMOJI } from "@/lib/constants";
import { formatVnd } from "@/lib/utils";
import {
  findCustomer,
  posCheckout,
  type CrmCustomer,
  type PosResult,
} from "@/app/admin/pos/actions";
import type { Category, Product, ProductVariant } from "@/lib/types";

type Line = {
  key: string;
  productId: string;
  variantId: string | null;
  name: string;
  label: string | null;
  price: number;
  qty: number;
};

function variantsOf(p: Product): ProductVariant[] {
  return [...(p.product_variants ?? [])].sort((a, b) => a.sort - b.sort);
}
function defaultVariant(p: Product): ProductVariant | null {
  const vs = variantsOf(p);
  if (vs.length === 0) return null;
  return vs.find((v) => v.sort === 2) ?? vs[0];
}

export function PosView({
  categories,
  products,
  servedBy,
}: {
  categories: Category[];
  products: Product[];
  servedBy: string;
}) {
  const [active, setActive] = useState("all");
  const [sizes, setSizes] = useState<Record<string, string>>({});
  const [cart, setCart] = useState<Record<string, Line>>({});
  const [phone, setPhone] = useState("");
  const [customer, setCustomer] = useState<CrmCustomer | null>(null);
  const [lookupMsg, setLookupMsg] = useState("");
  const [redeem, setRedeem] = useState(0);
  const [promo, setPromo] = useState("");
  const [payment, setPayment] = useState("Tiền mặt");
  const [result, setResult] = useState<PosResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [looking, startLookup] = useTransition();

  const tabs = [{ name: "Tất cả", slug: "all" }, ...categories.map((c) => ({ name: c.name, slug: c.slug }))];
  const list = products.filter((p) => active === "all" || p.categories?.slug === active);
  const lines = Object.values(cart);
  const subtotal = lines.reduce((t, l) => t + l.price * l.qty, 0);

  const maxRedeem = useMemo(() => {
    if (!customer) return 0;
    return Math.min(Math.floor(customer.points / 100) * 100, Math.floor(subtotal / 10000) * 100);
  }, [customer, subtotal]);
  const redeemDiscount = Math.min(Math.floor(redeem / 100) * 10000, subtotal);
  const net = subtotal - redeemDiscount;

  function add(p: Product) {
    const vs = variantsOf(p);
    const chosenId = sizes[p.id] ?? defaultVariant(p)?.id ?? null;
    const v = vs.find((x) => x.id === chosenId) ?? null;
    const key = v?.id ?? p.id;
    setCart((c) => {
      const cur = c[key];
      return {
        ...c,
        [key]: {
          key,
          productId: p.id,
          variantId: v?.id ?? null,
          name: p.name,
          label: v?.label ?? null,
          price: v?.price ?? p.price,
          qty: (cur?.qty ?? 0) + 1,
        },
      };
    });
  }
  function changeQty(key: string, d: number) {
    setCart((c) => {
      const cur = c[key];
      if (!cur) return c;
      const qty = cur.qty + d;
      const next = { ...c };
      if (qty <= 0) delete next[key];
      else next[key] = { ...cur, qty };
      return next;
    });
  }

  function lookup() {
    setLookupMsg("");
    setResult(null);
    startLookup(async () => {
      const c = await findCustomer(phone);
      if (c) setCustomer(c);
      else {
        setCustomer(null);
        setLookupMsg("Không tìm thấy khách — tính là khách vãng lai.");
      }
    });
  }
  function clearCustomer() {
    setCustomer(null);
    setPhone("");
    setRedeem(0);
    setLookupMsg("");
  }

  function checkout() {
    setResult(null);
    startTransition(async () => {
      const res = await posCheckout({
        items: lines.map((l) => ({ product_id: l.productId, qty: l.qty, variant_id: l.variantId })),
        payment,
        customerId: customer?.id ?? null,
        redeem,
        servedBy,
        promoCode: promo.trim() || null,
      });
      setResult(res);
      if (res.ok) {
        setCart({});
        clearCustomer();
        setPromo("");
        setPayment("Tiền mặt");
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div>
        <div className="mb-3 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.slug}
              onClick={() => setActive(t.slug)}
              className={`rounded-full border px-4 py-2 text-[10px] uppercase tracking-[0.12em] ${
                active === t.slug ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {list.map((p) => {
            const vs = variantsOf(p);
            const chosenId = sizes[p.id] ?? defaultVariant(p)?.id ?? null;
            const chosen = vs.find((x) => x.id === chosenId);
            return (
              <div key={p.id} className="rounded-2xl border border-border bg-paper p-3 text-center">
                <button onClick={() => add(p)} className="w-full transition-transform active:scale-95">
                  <div className="mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff,#ece6da)] text-xl">
                    {CATEGORY_EMOJI[p.categories?.slug ?? ""] ?? "🥤"}
                  </div>
                  <div className="font-display text-sm font-semibold leading-tight">{p.name}</div>
                  <div className="mt-0.5 text-xs text-primary">{formatVnd(chosen?.price ?? p.price)}</div>
                </button>
                {vs.length > 0 && (
                  <div className="mt-2 flex justify-center gap-1">
                    {vs.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setSizes((s) => ({ ...s, [p.id]: v.id }))}
                        className={`rounded-full border px-2 py-0.5 text-[9px] ${
                          chosenId === v.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                        }`}
                      >
                        {v.label.split(" ")[0]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-4 lg:sticky lg:top-20 lg:h-fit">
        <div className="rounded-2xl border border-border bg-paper p-4">
          {customer ? (
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              <div className="flex-1 text-sm">
                <b>{customer.name}</b> · {customer.rank}
                <div className="text-xs text-muted-foreground">{customer.points} điểm</div>
              </div>
              <button onClick={clearCustomer} aria-label="Bỏ chọn khách">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && lookup()}
                  placeholder="SĐT khách (CRM)"
                  className="flex-1 rounded-xl border border-border bg-transparent px-3 py-2 text-sm outline-none"
                />
                <button onClick={lookup} disabled={looking} className="flex items-center gap-1 rounded-xl bg-foreground px-3 text-[11px] uppercase tracking-wide text-background">
                  <Search className="h-4 w-4" /> Tra
                </button>
              </div>
              {lookupMsg && <p className="mt-2 text-xs text-amber-700">{lookupMsg}</p>}
            </>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-paper p-4">
          {lines.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Chọn món…</p>
          ) : (
            lines.map((l) => (
              <div key={l.key} className="flex items-center gap-2 border-b border-border py-2 text-sm last:border-0">
                <button onClick={() => changeQty(l.key, -1)} className="flex h-6 w-6 items-center justify-center rounded-full border border-border">
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-4 text-center">{l.qty}</span>
                <button onClick={() => changeQty(l.key, 1)} className="flex h-6 w-6 items-center justify-center rounded-full border border-border">
                  <Plus className="h-3 w-3" />
                </button>
                <span className="flex-1">
                  {l.name}
                  {l.label && <span className="text-muted-foreground"> · {l.label.split(" ")[0]}</span>}
                </span>
                <span className="text-primary">{formatVnd(l.price * l.qty)}</span>
              </div>
            ))
          )}

          <input
            value={promo}
            onChange={(e) => setPromo(e.target.value)}
            placeholder="Mã giảm giá"
            className="mt-3 w-full rounded-xl border border-border bg-paper px-3 py-2 text-sm uppercase outline-none focus:border-primary"
          />

          {customer && maxRedeem > 0 && (
            <div className="mt-3 flex items-center justify-between gap-2 text-sm">
              <label className="text-xs text-muted-foreground">Đổi điểm (tối đa {maxRedeem})</label>
              <input
                type="number"
                min={0}
                max={maxRedeem}
                step={100}
                value={redeem}
                onChange={(e) => setRedeem(Math.min(maxRedeem, Math.max(0, Number(e.target.value))))}
                className="w-24 rounded-lg border border-border bg-transparent px-2 py-1 text-right text-sm"
              />
            </div>
          )}
          {redeemDiscount > 0 && (
            <div className="mt-2 flex justify-between text-sm text-emerald-700">
              <span>Đổi điểm</span>
              <span>-{formatVnd(redeemDiscount)}</span>
            </div>
          )}

          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Tạm tính</span>
            <span className="font-display text-2xl font-bold">{formatVnd(net)}</span>
          </div>

          <select value={payment} onChange={(e) => setPayment(e.target.value)} className="mt-3 w-full rounded-xl border border-border bg-paper p-2.5 text-sm">
            {["Tiền mặt", "QR VNPay", "Momo", "QR ZaloPay", "Thẻ ngân hàng"].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>

          <button
            disabled={pending || lines.length === 0}
            onClick={checkout}
            className="mt-3 w-full rounded-full bg-foreground py-3.5 text-[12px] uppercase tracking-[0.2em] text-background disabled:opacity-50"
          >
            {pending ? "Đang xử lý…" : "Thanh toán"}
          </button>
        </div>

        {result &&
          (result.ok ? (
            <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-center text-sm text-emerald-800">
              <div className="text-3xl">✅</div>
              <p className="mt-1 font-display text-lg font-semibold">Hóa đơn {result.code}</p>
              <p>Thu {formatVnd(result.total)}</p>
              {result.discount > 0 && <p>Đã giảm {formatVnd(result.discount)}</p>}
              {result.earned > 0 && <p>+{result.earned} điểm tích lũy</p>}
            </div>
          ) : (
            <p className="rounded-xl bg-red-50 p-3 text-center text-sm text-red-700">{result.error}</p>
          ))}
      </div>
    </div>
  );
}
