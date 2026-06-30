import { createClient } from "@/lib/supabase/server";
import { formatVnd } from "@/lib/utils";
import type { Ingredient, Order } from "@/lib/types";

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border bg-paper p-5">
      <div className="font-display text-3xl font-bold">{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{label}</div>
    </div>
  );
}

export default async function AdminDashboard() {
  const supabase = createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("code, customer_name, source, total_amount, payment, created_at")
    .order("created_at", { ascending: false })
    .returns<Order[]>();
  const { data: ingredients } = await supabase
    .from("ingredients")
    .select("*")
    .returns<Ingredient[]>();

  const list = orders ?? [];
  const revenue = list.reduce((t, o) => t + Number(o.total_amount), 0);
  const lowStock = (ingredients ?? []).filter((i) => Number(i.stock) < Number(i.min_stock));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Doanh thu" value={formatVnd(revenue)} />
        <Kpi label="Số đơn" value={list.length} />
        <Kpi label="TB / đơn" value={list.length ? formatVnd(Math.round(revenue / list.length)) : "0đ"} />
        <Kpi label="NL dưới ngưỡng" value={lowStock.length} />
      </div>

      {lowStock.length > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          ⚠️ Cần nhập thêm: {lowStock.map((i) => `${i.name} (${i.stock}${i.unit})`).join(", ")}
        </div>
      )}

      <div>
        <h2 className="mb-3 font-display text-xl font-semibold">Đơn hàng gần đây</h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-paper">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="p-3">Mã</th>
                <th className="p-3">Nguồn</th>
                <th className="p-3">Khách</th>
                <th className="p-3">Thanh toán</th>
                <th className="p-3 text-right">Tổng</th>
              </tr>
            </thead>
            <tbody>
              {list.slice(0, 10).map((o) => (
                <tr key={o.code} className="border-b border-border last:border-0">
                  <td className="p-3 font-medium">{o.code}</td>
                  <td className="p-3">{o.source}</td>
                  <td className="p-3 text-muted-foreground">{o.customer_name}</td>
                  <td className="p-3">{o.payment}</td>
                  <td className="p-3 text-right text-primary">{formatVnd(o.total_amount)}</td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">
                    Chưa có đơn hàng.
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
