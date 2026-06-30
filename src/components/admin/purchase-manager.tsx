"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPurchaseOrder, setPoStatus } from "@/app/admin/dat-hang/actions";
import type { Ingredient } from "@/lib/types";

type Supplier = { id: string; code: string | null; name: string };
export type PoRow = {
  id: string;
  code: string;
  status: string;
  created_at: string;
  suppliers: { name: string } | null;
};

const STATUS = [
  { v: "draft", l: "Nháp" },
  { v: "sent", l: "Đã gửi NCC" },
  { v: "received", l: "Đã nhận" },
];

export function PurchaseManager({
  ingredients,
  suppliers,
  pos,
}: {
  ingredients: Ingredient[];
  suppliers: Supplier[];
  pos: PoRow[];
}) {
  const router = useRouter();
  const low = ingredients.filter((i) => Number(i.stock) < Number(i.min_stock));
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  // gợi ý số lượng đặt = đưa tồn lên gấp đôi ngưỡng
  const [qtys, setQtys] = useState<Record<string, number>>(() =>
    Object.fromEntries(low.map((i) => [i.id, Math.max(Number(i.min_stock) * 2 - Number(i.stock), 0)])),
  );
  const [checked, setChecked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(low.map((i) => [i.id, true])),
  );
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setMsg(null);
    const items = low.filter((i) => checked[i.id]).map((i) => ({ ingredient_id: i.id, qty: qtys[i.id] ?? 0 }));
    start(async () => {
      const res = await createPurchaseOrder(supplierId, items);
      if (res.ok) {
        setMsg({ ok: true, text: "Đã tạo phiếu đặt và gửi NCC." });
        router.refresh();
      } else setMsg({ ok: false, text: res.error ?? "Lỗi" });
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-2 font-display text-xl font-semibold">Gợi ý đặt hàng (nguyên liệu dưới ngưỡng)</h2>
        {low.length === 0 ? (
          <p className="text-sm text-muted-foreground">Không có nguyên liệu nào dưới ngưỡng. 👍</p>
        ) : (
          <div className="rounded-2xl border border-border bg-paper p-4">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <label className="text-xs text-muted-foreground">Nhà cung cấp:</label>
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="rounded-xl border border-border bg-paper px-3 py-2 text-sm">
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="p-2"></th>
                  <th className="p-2">Nguyên liệu</th>
                  <th className="p-2 text-right">Tồn / Ngưỡng</th>
                  <th className="p-2 text-right">SL đặt</th>
                </tr>
              </thead>
              <tbody>
                {low.map((i) => (
                  <tr key={i.id} className="border-t border-border">
                    <td className="p-2">
                      <input type="checkbox" checked={checked[i.id] ?? false} onChange={(e) => setChecked((c) => ({ ...c, [i.id]: e.target.checked }))} />
                    </td>
                    <td className="p-2">{i.name}</td>
                    <td className="p-2 text-right text-muted-foreground">{i.stock} / {i.min_stock} {i.unit}</td>
                    <td className="p-2 text-right">
                      <input
                        type="number"
                        value={qtys[i.id] ?? 0}
                        onChange={(e) => setQtys((q) => ({ ...q, [i.id]: Number(e.target.value) }))}
                        className="w-24 rounded-lg border border-border bg-transparent px-2 py-1 text-right"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {msg && <p className={`mt-3 text-sm ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</p>}
            <button onClick={submit} disabled={pending} className="mt-4 rounded-full bg-foreground px-6 py-3 text-[11px] uppercase tracking-[0.12em] text-background disabled:opacity-60">
              {pending ? "Đang tạo…" : "Tạo phiếu đặt & gửi NCC"}
            </button>
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-2 font-display text-xl font-semibold">Phiếu đặt hàng</h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-paper">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="p-3">Mã phiếu</th>
                <th className="p-3">Nhà cung cấp</th>
                <th className="p-3">Ngày</th>
                <th className="p-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {pos.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="p-3 font-medium">{p.code}</td>
                  <td className="p-3">{p.suppliers?.name}</td>
                  <td className="p-3 text-muted-foreground">{new Date(p.created_at).toLocaleDateString("vi-VN")}</td>
                  <td className="p-3">
                    <select
                      value={p.status}
                      disabled={pending}
                      onChange={(e) => start(async () => { await setPoStatus(p.id, e.target.value); router.refresh(); })}
                      className="rounded-lg border border-border bg-paper px-2 py-1 text-xs"
                    >
                      {STATUS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
              {pos.length === 0 && (
                <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Chưa có phiếu đặt.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
