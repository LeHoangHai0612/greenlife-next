"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ImportResult = { ok: boolean; count?: number; error?: string };
type Row = Record<string, unknown>;

const str = (v: unknown) => (v == null ? "" : String(v).trim());
const num = (v: unknown) => {
  const n = Number(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

// Nhập nguyên liệu (upsert theo mã id). Cột: id, name, unit, stock, min_stock
export async function importIngredients(rows: Row[]): Promise<ImportResult> {
  const supabase = createClient();
  const clean = rows
    .map((r) => ({
      id: str(r.id ?? r["mã"] ?? r["ma"]),
      name: str(r.name ?? r["tên"] ?? r["ten"]),
      unit: str(r.unit ?? r["đvt"] ?? r["dvt"]) || "g",
      stock: num(r.stock ?? r["tồn"] ?? r["ton"]),
      min_stock: num(r.min_stock ?? r["ngưỡng"] ?? r["nguong"]),
    }))
    .filter((r) => r.id && r.name);

  if (clean.length === 0) return { ok: false, error: "Không có dòng hợp lệ (cần cột id, name)." };

  const { error } = await supabase.from("ingredients").upsert(clean, { onConflict: "id" });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/kho");
  return { ok: true, count: clean.length };
}

// Nhập sản phẩm. Cột: name, description, price, cost, calo, hsd, category_slug
export async function importProducts(rows: Row[]): Promise<ImportResult> {
  const supabase = createClient();
  const { data: cats } = await supabase.from("categories").select("id, slug");
  const slugToId = new Map((cats ?? []).map((c) => [c.slug, c.id]));

  const clean = rows
    .map((r) => ({
      name: str(r.name ?? r["tên"] ?? r["ten"]),
      description: str(r.description ?? r["mô tả"] ?? r["mota"]) || null,
      price: num(r.price ?? r["giá"] ?? r["gia"]),
      cost: num(r.cost ?? r["giá vốn"] ?? r["gia von"]),
      calo: num(r.calo),
      hsd: str(r.hsd) || null,
      category_id: slugToId.get(str(r.category_slug ?? r["nhóm"] ?? r["nhom"])) ?? null,
      is_active: true,
    }))
    .filter((r) => r.name && r.price > 0);

  if (clean.length === 0) return { ok: false, error: "Không có dòng hợp lệ (cần cột name, price)." };

  const { error } = await supabase.from("products").insert(clean);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/san-pham");
  return { ok: true, count: clean.length };
}
