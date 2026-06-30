"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProduction, setProductionStatus, setQcOut } from "@/app/admin/san-xuat/actions";

export type ProdOrder = {
  id: string;
  code: string;
  qty: number;
  status: string;
  qc_out: string;
  qc_note: string | null;
  products: { name: string } | null;
};
type Opt = { id: string; name: string };

const STATUS = [
  { v: "planned", l: "Đã lên lệnh" },
  { v: "producing", l: "Đang sản xuất" },
  { v: "done", l: "Hoàn thành" },
];
const QC = [
  { v: "pending", l: "Chờ kiểm" },
  { v: "passed", l: "Đạt" },
  { v: "rejected", l: "Loại bỏ" },
];

export function ProductionManager({ orders, products }: { orders: ProdOrder[]; products: Opt[] }) {
  const router = useRouter();
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [qty, setQty] = useState(10);
  const [pending, start] = useTransition();

  const field = "rounded-xl border border-border bg-paper px-3 py-2.5 text-sm";

  function add() {
    start(async () => {
      await createProduction(productId, qty);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-paper p-5">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Sản phẩm</label>
          <select className={field} value={productId} onChange={(e) => setProductId(e.target.value)}>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Số lượng (ly)</label>
          <input type="number" className={field} value={qty} onChange={(e) => setQty(Number(e.target.value))} />
        </div>
        <button onClick={add} disabled={pending} className="rounded-full bg-foreground px-5 py-2.5 text-[11px] uppercase tracking-[0.12em] text-background disabled:opacity-60">
          + Lập lệnh sản xuất
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-paper">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="p-3">Mã LSX</th>
              <th className="p-3">Sản phẩm</th>
              <th className="p-3 text-right">SL</th>
              <th className="p-3">Trạng thái</th>
              <th className="p-3">QC đầu ra</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-border last:border-0">
                <td className="p-3 font-medium">{o.code}</td>
                <td className="p-3">{o.products?.name}</td>
                <td className="p-3 text-right">{o.qty}</td>
                <td className="p-3">
                  <select
                    value={o.status}
                    disabled={pending}
                    onChange={(e) => start(async () => { await setProductionStatus(o.id, e.target.value); router.refresh(); })}
                    className="rounded-lg border border-border bg-paper px-2 py-1 text-xs"
                  >
                    {STATUS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
                  </select>
                </td>
                <td className="p-3">
                  <select
                    value={o.qc_out}
                    disabled={pending}
                    onChange={(e) => start(async () => { await setQcOut(o.id, e.target.value, o.qc_note); router.refresh(); })}
                    className="rounded-lg border border-border bg-paper px-2 py-1 text-xs"
                  >
                    {QC.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
                  </select>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Chưa có lệnh sản xuất.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
