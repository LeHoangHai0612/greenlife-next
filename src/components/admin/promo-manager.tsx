"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createPromo, togglePromo, deletePromo, type PromoInput } from "@/app/admin/khuyen-mai/actions";
import { formatVnd } from "@/lib/utils";

export type Promo = {
  id: string;
  code: string;
  description: string | null;
  kind: "percent" | "amount";
  value: number;
  min_total: number;
  active: boolean;
};

const empty: PromoInput = { code: "", description: "", kind: "percent", value: 0, min_total: 0 };

export function PromoManager({ promos }: { promos: Promo[] }) {
  const router = useRouter();
  const [form, setForm] = useState<PromoInput>(empty);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();

  const field = "rounded-xl border border-border bg-paper px-3 py-2.5 text-sm outline-none focus:border-primary";

  function add() {
    setErr("");
    start(async () => {
      const res = await createPromo(form);
      if (res.ok) {
        setForm(empty);
        router.refresh();
      } else setErr(res.error ?? "Lỗi");
    });
  }

  return (
    <div className="space-y-6">
      {/* form thêm */}
      <div className="rounded-2xl border border-border bg-paper p-5">
        <h3 className="mb-3 font-display text-lg font-semibold">Thêm khuyến mãi</h3>
        <div className="flex flex-wrap items-end gap-3">
          <input className={field} placeholder="Mã (VD HE2026)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <select className={field} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as "percent" | "amount" })}>
            <option value="percent">Giảm %</option>
            <option value="amount">Giảm tiền</option>
          </select>
          <input type="number" className={field} placeholder={form.kind === "percent" ? "% giảm" : "Số tiền"} value={form.value || ""} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />
          <input type="number" className={field} placeholder="Đơn tối thiểu" value={form.min_total || ""} onChange={(e) => setForm({ ...form, min_total: Number(e.target.value) })} />
          <input className={`${field} flex-1`} placeholder="Mô tả" value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <button onClick={add} disabled={pending} className="rounded-full bg-foreground px-5 py-2.5 text-[11px] uppercase tracking-[0.12em] text-background disabled:opacity-60">
            Thêm
          </button>
        </div>
        {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      </div>

      {/* danh sách */}
      <div className="overflow-hidden rounded-2xl border border-border bg-paper">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="p-3">Mã</th>
              <th className="p-3">Loại</th>
              <th className="p-3 text-right">Giá trị</th>
              <th className="p-3 text-right">Đơn tối thiểu</th>
              <th className="p-3">Mô tả</th>
              <th className="p-3">Trạng thái</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {promos.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="p-3 font-medium">{p.code}</td>
                <td className="p-3">{p.kind === "percent" ? "Giảm %" : "Giảm tiền"}</td>
                <td className="p-3 text-right">{p.kind === "percent" ? `${p.value}%` : formatVnd(p.value)}</td>
                <td className="p-3 text-right text-muted-foreground">{formatVnd(p.min_total)}</td>
                <td className="p-3 text-muted-foreground">{p.description}</td>
                <td className="p-3">
                  <button
                    onClick={() => start(async () => { await togglePromo(p.id, !p.active); router.refresh(); })}
                    className={`rounded-full px-2.5 py-1 text-[10px] uppercase ${p.active ? "bg-emerald-100 text-emerald-700" : "bg-stone-200 text-stone-600"}`}
                  >
                    {p.active ? "Bật" : "Tắt"}
                  </button>
                </td>
                <td className="p-3 text-right">
                  <button onClick={() => start(async () => { await deletePromo(p.id); router.refresh(); })} aria-label="Xóa" className="text-muted-foreground hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {promos.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Chưa có khuyến mãi.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
