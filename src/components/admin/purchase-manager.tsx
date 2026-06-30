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
  const isLow = (i: Ingredient) => Number(i.stock) < Number(i.min_stock);
  const lowCount = ingredients.filter(isLow).length;

  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  // gợi ý số lượng: NL dưới ngưỡng -> đưa tồn lên gấp đôi ngưỡng; còn lại 0
  const [qtys, setQtys] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      ingredients.map((i) => [i.id, isLow(i) ? Math.max(Number(i.min_stock) * 2 - Number(i.stock), 0) : 0]),
    ),
  );
  // mặc định tích sẵn các NL dưới ngưỡng
  const [checked, setChecked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(ingredients.map((i) => [i.id, isLow(i)])),
  );
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const selectedCount = ingredients.filter((i) => checked[i.id] && (qtys[i.id] ?? 0) > 0).length;

  function submit() {
    setMsg(null);
    const items = ingredients
      .filter((i) => checked[i.id] && (qtys[i.id] ?? 0) > 0)
      .map((i) => ({ ingredient_id: i.id, qty: qtys[i.id] }));
    if (!supplierId) return setMsg({ ok: false, text: "Hãy chọn nhà cung cấp." });
    if (items.length === 0) return setMsg({ ok: false, text: "Hãy tích chọn ít nhất 1 nguyên liệu (số lượng > 0)." });
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
        <h2 className="mb-1 font-display text-xl font-semibold">Tạo phiếu đặt nguyên liệu</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          {lowCount > 0
            ? `Có ${lowCount} nguyên liệu dưới ngưỡng (đã tích sẵn). Bạn có thể chọn thêm bất kỳ nguyên liệu nào.`
            : "Tất cả nguyên liệu đang đủ. Tích chọn nguyên liệu bạn muốn đặt thêm."}
        </p>

        <div className="rounded-2xl border border-border bg-paper p-4">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <label className="text-xs text-muted-foreground">Nhà cung cấp:</label>
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="rounded-xl border border-border bg-paper px-3 py-2 text-sm">
              {suppliers.length === 0 && <option value="">— Chưa có NCC —</option>}
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="max-h-96 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-paper">
                <tr className="text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="p-2"></th>
                  <th className="p-2">Nguyên liệu</th>
                  <th className="p-2 text-right">Tồn / Ngưỡng</th>
                  <th className="p-2">Trạng thái</th>
                  <th className="p-2 text-right">SL đặt</th>
                </tr>
              </thead>
              <tbody>
                {ingredients.map((i) => {
                  const low = isLow(i);
                  return (
                    <tr key={i.id} className="border-t border-border">
                      <td className="p-2">
                        <input type="checkbox" checked={checked[i.id] ?? false} onChange={(e) => setChecked((c) => ({ ...c, [i.id]: e.target.checked }))} />
                      </td>
                      <td className="p-2">{i.name}</td>
                      <td className="p-2 text-right text-muted-foreground">{Number(i.stock).toLocaleString("vi-VN")} / {i.min_stock} {i.unit}</td>
                      <td className="p-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${low ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                          {low ? "Dưới ngưỡng" : "Đủ"}
                        </span>
                      </td>
                      <td className="p-2 text-right">
                        <input
                          type="number"
                          min={0}
                          value={qtys[i.id] ?? 0}
                          onChange={(e) => setQtys((q) => ({ ...q, [i.id]: Number(e.target.value) }))}
                          className="w-24 rounded-lg border border-border bg-transparent px-2 py-1 text-right"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {msg && <p className={`mt-3 text-sm ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</p>}

          <button
            onClick={submit}
            disabled={pending}
            className="mt-4 rounded-full bg-foreground px-6 py-3 text-[11px] uppercase tracking-[0.12em] text-background disabled:opacity-60"
          >
            {pending ? "Đang tạo…" : `Tạo phiếu đặt & gửi NCC${selectedCount ? ` (${selectedCount})` : ""}`}
          </button>
        </div>
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
