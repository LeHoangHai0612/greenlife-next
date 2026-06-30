"use server";

import { createClient } from "@/lib/supabase/server";

export type ReportRow = {
  code: string;
  created_at: string;
  customer_name: string | null;
  payment: string;
  total_amount: number;
};

export type Report = {
  revenue: number;
  count: number;
  online: number;
  byPay: Record<string, number>;
  byHour: number[]; // doanh thu theo giờ 0..23
  top: { name: string; qty: number }[];
  rows: ReportRow[];
};

type Raw = {
  code: string;
  created_at: string;
  customer_name: string | null;
  payment: string;
  source: string;
  total_amount: number;
  order_items: { product_id: string; quantity: number }[];
};

// Tổng hợp báo cáo theo khoảng ngày (from/to dạng YYYY-MM-DD)
export async function getReport(from?: string | null, to?: string | null): Promise<Report> {
  const supabase = createClient();
  let q = supabase
    .from("orders")
    .select("code, created_at, customer_name, payment, source, total_amount, order_items(product_id, quantity)");
  if (from) q = q.gte("created_at", `${from}T00:00:00`);
  if (to) q = q.lte("created_at", `${to}T23:59:59.999`);
  const { data } = await q.order("created_at", { ascending: false }).returns<Raw[]>();
  const { data: prods } = await supabase.from("products").select("id, name");
  const nameOf = new Map((prods ?? []).map((p) => [p.id, p.name]));

  const orders = data ?? [];
  const revenue = orders.reduce((t, o) => t + Number(o.total_amount), 0);
  const byPay: Record<string, number> = {};
  const byHour = Array(24).fill(0) as number[];
  const units: Record<string, number> = {};
  let online = 0;

  for (const o of orders) {
    byPay[o.payment] = (byPay[o.payment] ?? 0) + 1;
    if (o.source === "Khách đặt") online++;
    const h = new Date(o.created_at).getHours();
    byHour[h] += Number(o.total_amount);
    for (const it of o.order_items ?? []) units[it.product_id] = (units[it.product_id] ?? 0) + it.quantity;
  }

  const top = Object.entries(units)
    .map(([id, qty]) => ({ name: nameOf.get(id) ?? id, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 8);

  const rows: ReportRow[] = orders.map((o) => ({
    code: o.code,
    created_at: o.created_at,
    customer_name: o.customer_name,
    payment: o.payment,
    total_amount: Number(o.total_amount),
  }));

  return { revenue, count: orders.length, online, byPay, byHour, top, rows };
}
