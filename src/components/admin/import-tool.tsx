"use client";

import { useState, useTransition } from "react";
import * as XLSX from "xlsx";
import { Upload, FileDown, CheckCircle2, AlertCircle } from "lucide-react";
import {
  importIngredients,
  importProducts,
  type ImportResult,
} from "@/app/admin/nhap-lieu/actions";

type Target = "ingredients" | "products";
type Row = Record<string, unknown>;

const SCHEMAS: Record<Target, { label: string; cols: string[]; sample: Row[] }> = {
  ingredients: {
    label: "Nguyên liệu (kho)",
    cols: ["id", "name", "unit", "stock", "min_stock"],
    sample: [
      { id: "NL013", name: "Chanh vàng", unit: "g", stock: 500, min_stock: 100 },
      { id: "NL014", name: "Hạt chia", unit: "g", stock: 300, min_stock: 80 },
    ],
  },
  products: {
    label: "Sản phẩm",
    cols: ["name", "description", "price", "cost", "calo", "hsd", "category_slug"],
    sample: [
      {
        name: "Trà Đào Cam Sả",
        description: "Trà đào, cam, sả tươi",
        price: 45000,
        cost: 15000,
        calo: 90,
        hsd: "48h",
        category_slug: "tra",
      },
    ],
  },
};

const SLUGS = "kombucha · detox · tra · sua-hat · sinh-to · nuoc-uong";

export function ImportTool() {
  const [target, setTarget] = useState<Target>("ingredients");
  const [rows, setRows] = useState<Row[]>([]);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, startTransition] = useTransition();

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target?.result, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Row>(ws, { defval: "" });
      setRows(json);
    };
    reader.readAsArrayBuffer(file);
  }

  function downloadTemplate() {
    const ws = XLSX.utils.json_to_sheet(SCHEMAS[target].sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `mau_${target}.xlsx`);
  }

  function submit() {
    setResult(null);
    startTransition(async () => {
      const res = target === "ingredients" ? await importIngredients(rows) : await importProducts(rows);
      setResult(res);
      if (res.ok) setRows([]);
    });
  }

  const cols = rows.length ? Object.keys(rows[0]) : SCHEMAS[target].cols;

  return (
    <div className="space-y-6">
      {/* chọn loại dữ liệu */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(SCHEMAS) as Target[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTarget(t);
              setRows([]);
              setResult(null);
            }}
            className={`rounded-full border px-5 py-2.5 text-[11px] uppercase tracking-[0.12em] ${
              target === t
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground"
            }`}
          >
            {SCHEMAS[t].label}
          </button>
        ))}
      </div>

      {/* hướng dẫn cột */}
      <div className="rounded-2xl border border-border bg-paper p-4 text-sm">
        <p className="mb-1 font-medium">Cột yêu cầu:</p>
        <code className="text-xs text-primary">{SCHEMAS[target].cols.join(", ")}</code>
        {target === "products" && (
          <p className="mt-2 text-xs text-muted-foreground">
            <b>category_slug</b> nhận một trong: {SLUGS}
          </p>
        )}
        <button
          onClick={downloadTemplate}
          className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-primary"
        >
          <FileDown className="h-4 w-4" /> Tải file mẫu (.xlsx)
        </button>
      </div>

      {/* upload */}
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-paper p-10 text-center transition-colors hover:border-primary">
        <Upload className="h-7 w-7 text-muted-foreground" />
        <span className="text-sm font-medium">Chọn file Excel (.xlsx/.xls) hoặc CSV</span>
        <span className="text-xs text-muted-foreground">{fileName || "Chưa chọn file"}</span>
        <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFile} />
      </label>

      {/* kết quả */}
      {result && (
        <div
          className={`flex items-center gap-2 rounded-xl p-4 text-sm ${
            result.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
          }`}
        >
          {result.ok ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          {result.ok ? `Đã nhập ${result.count} dòng thành công.` : result.error}
        </div>
      )}

      {/* xem trước */}
      {rows.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">Xem trước ({rows.length} dòng)</p>
            <button
              disabled={pending}
              onClick={submit}
              className="rounded-full bg-foreground px-6 py-3 text-[11px] uppercase tracking-[0.15em] text-background disabled:opacity-60"
            >
              {pending ? "Đang nhập…" : `Nhập ${rows.length} dòng`}
            </button>
          </div>
          <div className="max-h-80 overflow-auto rounded-2xl border border-border bg-paper">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted">
                <tr className="text-left">
                  {cols.map((c) => (
                    <th key={c} className="p-2 font-medium uppercase tracking-wide text-muted-foreground">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 30).map((r, i) => (
                  <tr key={i} className="border-t border-border">
                    {cols.map((c) => (
                      <td key={c} className="p-2">
                        {String(r[c] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
