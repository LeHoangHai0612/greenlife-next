"use client";

import { useState, useTransition } from "react";
import * as XLSX from "xlsx";
import { FileDown } from "lucide-react";
import { getReport, type Report } from "@/app/admin/bao-cao/actions";
import { formatVnd } from "@/lib/utils";

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border bg-paper p-5">
      <div className="font-display text-2xl font-bold">{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{label}</div>
    </div>
  );
}

export function ReportView({ initial }: { initial: Report }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rep, setRep] = useState<Report>(initial);
  const [pending, start] = useTransition();

  function run() {
    start(async () => setRep(await getReport(from || null, to || null)));
  }

  function exportExcel() {
    const wb = XLSX.utils.book_new();
    const rows = rep.rows.map((r) => ({
      "Mã đơn": r.code,
      "Thời gian": new Date(r.created_at).toLocaleString("vi-VN"),
      "Khách hàng": r.customer_name ?? "",
      "Thanh toán": r.payment,
      "Tổng tiền": r.total_amount,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Đơn hàng");
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(rep.top.map((t) => ({ "Sản phẩm": t.name, "Số ly": t.qty }))),
      "Top sản phẩm",
    );
    const range = from || to ? `${from || "..."}_${to || "..."}` : "tatca";
    XLSX.writeFile(wb, `baocao_${range}.xlsx`);
  }

  const maxHour = Math.max(1, ...rep.byHour);
  const maxTop = rep.top.length ? rep.top[0].qty : 1;

  return (
    <div className="space-y-6">
      {/* bộ lọc */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Từ ngày</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-xl border border-border bg-paper px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Đến ngày</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-xl border border-border bg-paper px-3 py-2 text-sm" />
        </div>
        <button onClick={run} disabled={pending} className="rounded-full bg-foreground px-5 py-2.5 text-[11px] uppercase tracking-[0.12em] text-background disabled:opacity-60">
          {pending ? "Đang tính…" : "Xem"}
        </button>
        <button onClick={exportExcel} className="flex items-center gap-2 rounded-full border border-foreground px-5 py-2.5 text-[11px] uppercase tracking-[0.12em]">
          <FileDown className="h-4 w-4" /> Xuất Excel
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Doanh thu" value={formatVnd(rep.revenue)} />
        <Kpi label="Số đơn" value={rep.count} />
        <Kpi label="TB / đơn" value={rep.count ? formatVnd(Math.round(rep.revenue / rep.count)) : "0đ"} />
        <Kpi label="Đơn online" value={rep.online} />
      </div>

      {/* doanh thu theo giờ */}
      <div>
        <h2 className="mb-3 font-display text-xl font-semibold">Doanh thu theo giờ</h2>
        <div className="flex h-40 items-end gap-1 rounded-2xl border border-border bg-paper p-4">
          {rep.byHour.map((v, h) => (
            <div key={h} className="flex flex-1 flex-col items-center gap-1">
              <div className="w-full rounded-t bg-primary" style={{ height: `${(v / maxHour) * 100}%` }} title={`${h}h: ${formatVnd(v)}`} />
              <span className="text-[8px] text-muted-foreground">{h}</span>
            </div>
          ))}
        </div>
      </div>

      {/* top sản phẩm */}
      <div>
        <h2 className="mb-3 font-display text-xl font-semibold">Top sản phẩm</h2>
        <div className="space-y-2.5">
          {rep.top.map((t) => (
            <div key={t.name}>
              <div className="flex justify-between text-sm">
                <span>{t.name}</span>
                <b>{t.qty} ly</b>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary" style={{ width: `${(t.qty / maxTop) * 100}%` }} />
              </div>
            </div>
          ))}
          {rep.top.length === 0 && <p className="text-sm text-muted-foreground">Chưa có dữ liệu.</p>}
        </div>
      </div>

      {/* theo thanh toán */}
      <div>
        <h2 className="mb-3 font-display text-xl font-semibold">Theo hình thức thanh toán</h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-paper">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="p-3">Hình thức</th>
                <th className="p-3 text-right">Số đơn</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(rep.byPay).map(([k, v]) => (
                <tr key={k} className="border-b border-border last:border-0">
                  <td className="p-3">{k}</td>
                  <td className="p-3 text-right">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
