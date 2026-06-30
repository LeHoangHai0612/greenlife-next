import { createClient } from "@/lib/supabase/server";
import { formatVnd } from "@/lib/utils";
import type { Order } from "@/lib/types";

export default async function AdminOrdersPage() {
  const supabase = createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Order[]>();

  return (
    <div>
      <h2 className="mb-3 font-display text-xl font-semibold">Tất cả đơn hàng</h2>
      <div className="overflow-hidden rounded-2xl border border-border bg-paper">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="p-3">Mã</th>
              <th className="p-3">Ngày</th>
              <th className="p-3">Nguồn</th>
              <th className="p-3">Khách</th>
              <th className="p-3">Thanh toán</th>
              <th className="p-3 text-right">Tổng</th>
            </tr>
          </thead>
          <tbody>
            {(orders ?? []).map((o) => (
              <tr key={o.id} className="border-b border-border last:border-0">
                <td className="p-3 font-medium">{o.code}</td>
                <td className="p-3 text-muted-foreground">
                  {new Date(o.created_at).toLocaleString("vi-VN")}
                </td>
                <td className="p-3">{o.source}</td>
                <td className="p-3">{o.customer_name}</td>
                <td className="p-3">{o.payment}</td>
                <td className="p-3 text-right text-primary">{formatVnd(o.total_amount)}</td>
              </tr>
            ))}
            {(!orders || orders.length === 0) && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  Chưa có đơn hàng.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
