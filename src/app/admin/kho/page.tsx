import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Ingredient } from "@/lib/types";

type Batch = {
  id: string;
  ingredient_id: string;
  batch_code: string;
  qty_remaining: number;
  expiry_date: string | null;
  qc_status: string;
};

type Tx = {
  id: string;
  ingredient_id: string;
  change: number;
  reason: string | null;
  created_at: string;
};

export default async function InventoryPage() {
  const supabase = createClient();
  const { data: ingredients } = await supabase
    .from("ingredients")
    .select("*")
    .order("id")
    .returns<Ingredient[]>();
  const { data: batches } = await supabase
    .from("ingredient_batches")
    .select("id, ingredient_id, batch_code, qty_remaining, expiry_date, qc_status")
    .order("expiry_date")
    .returns<Batch[]>();
  const { data: txs } = await supabase
    .from("inventory_tx")
    .select("id, ingredient_id, change, reason, created_at")
    .order("created_at", { ascending: false })
    .limit(40)
    .returns<Tx[]>();

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Kho nguyên liệu</h2>
          <Link
            href="/admin/nhap-kho"
            className="rounded-full bg-foreground px-4 py-2 text-[11px] uppercase tracking-[0.12em] text-background"
          >
            + Nhập kho
          </Link>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border bg-paper">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="p-3">Mã</th>
                <th className="p-3">Nguyên liệu</th>
                <th className="p-3 text-right">Tồn</th>
                <th className="p-3 text-right">Ngưỡng</th>
                <th className="p-3">ĐVT</th>
                <th className="p-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {(ingredients ?? []).map((i) => {
                const low = Number(i.stock) < Number(i.min_stock);
                return (
                  <tr key={i.id} className="border-b border-border last:border-0">
                    <td className="p-3">{i.id}</td>
                    <td className="p-3 font-medium">{i.name}</td>
                    <td className="p-3 text-right font-semibold">{Number(i.stock).toLocaleString("vi-VN")}</td>
                    <td className="p-3 text-right text-muted-foreground">{i.min_stock}</td>
                    <td className="p-3">{i.unit}</td>
                    <td className="p-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-wide ${
                          low ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {low ? "Dưới ngưỡng" : "Đủ"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-display text-xl font-semibold">Lô nhập & QC (truy xuất nguồn gốc)</h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-paper">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="p-3">Mã lô</th>
                <th className="p-3">Nguyên liệu</th>
                <th className="p-3 text-right">Còn lại</th>
                <th className="p-3">HSD</th>
                <th className="p-3">QC</th>
              </tr>
            </thead>
            <tbody>
              {(batches ?? []).map((b) => (
                <tr key={b.id} className="border-b border-border last:border-0">
                  <td className="p-3 font-medium">{b.batch_code}</td>
                  <td className="p-3">{b.ingredient_id}</td>
                  <td className="p-3 text-right">{b.qty_remaining}</td>
                  <td className="p-3">{b.expiry_date ?? "—"}</td>
                  <td className="p-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] uppercase ${
                        b.qc_status === "passed"
                          ? "bg-emerald-100 text-emerald-700"
                          : b.qc_status === "rejected"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {b.qc_status}
                    </span>
                  </td>
                </tr>
              ))}
              {(!batches || batches.length === 0) && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">
                    Chưa có lô nhập.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-display text-xl font-semibold">Nhật ký nhập - xuất kho</h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-paper">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="p-3">Thời gian</th>
                <th className="p-3">Nguyên liệu</th>
                <th className="p-3 text-right">Thay đổi</th>
                <th className="p-3">Lý do / Chứng từ</th>
              </tr>
            </thead>
            <tbody>
              {(txs ?? []).map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0">
                  <td className="p-3 text-muted-foreground">
                    {new Date(t.created_at).toLocaleString("vi-VN")}
                  </td>
                  <td className="p-3">{t.ingredient_id}</td>
                  <td
                    className={`p-3 text-right font-semibold ${
                      t.change >= 0 ? "text-emerald-700" : "text-red-600"
                    }`}
                  >
                    {t.change >= 0 ? "+" : ""}
                    {Number(t.change).toLocaleString("vi-VN")}
                  </td>
                  <td className="p-3 text-muted-foreground">{t.reason}</td>
                </tr>
              ))}
              {(!txs || txs.length === 0) && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-muted-foreground">
                    Chưa có giao dịch kho.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
