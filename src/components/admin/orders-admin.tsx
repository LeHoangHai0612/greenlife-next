"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";
import { cancelOrder } from "@/app/admin/don-hang/actions";
import { formatVnd } from "@/lib/utils";
import type { Order } from "@/lib/types";

const statusPill: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
  pending: "bg-amber-100 text-amber-700",
};
const statusLabel: Record<string, string> = {
  paid: "Đã thanh toán",
  cancelled: "Đã hủy",
  pending: "Chờ",
};

export function OrdersAdmin({ orders }: { orders: Order[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();

  function cancel(o: Order) {
    if (!confirm(`Hủy đơn ${o.code}? Kho sẽ được hoàn lại.`)) return;
    setMsg("");
    start(async () => {
      const res = await cancelOrder(o.id, o.code);
      if (!res.ok) setMsg(res.error ?? "Lỗi");
      router.refresh();
    });
  }

  return (
    <div>
      <h2 className="mb-3 font-display text-xl font-semibold">Tất cả đơn hàng</h2>
      {msg && <p className="mb-2 text-sm text-red-600">{msg}</p>}
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
              <th className="p-3">Trạng thái</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-border last:border-0">
                <td className="p-3 font-medium">{o.code}</td>
                <td className="p-3 text-muted-foreground">{new Date(o.created_at).toLocaleString("vi-VN")}</td>
                <td className="p-3">{o.source}</td>
                <td className="p-3">{o.customer_name}</td>
                <td className="p-3">{o.payment}</td>
                <td className="p-3 text-right text-primary">{formatVnd(o.total_amount)}</td>
                <td className="p-3">
                  <span className={`rounded-full px-2.5 py-1 text-[10px] uppercase ${statusPill[o.status] ?? statusPill.pending}`}>
                    {statusLabel[o.status] ?? o.status}
                  </span>
                </td>
                <td className="p-3 text-right">
                  {o.status !== "cancelled" && (
                    <button
                      onClick={() => cancel(o)}
                      disabled={pending}
                      className="inline-flex items-center gap-1 text-muted-foreground hover:text-red-600 disabled:opacity-50"
                      aria-label="Hủy đơn"
                    >
                      <Ban className="h-4 w-4" /> Hủy
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Chưa có đơn hàng.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
