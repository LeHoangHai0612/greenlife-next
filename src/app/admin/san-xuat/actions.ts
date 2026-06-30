"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type Res = { ok: boolean; error?: string };

export async function createProduction(productId: string, qty: number): Promise<Res> {
  if (!productId || !qty || qty <= 0) return { ok: false, error: "Chọn sản phẩm và số lượng." };
  const supabase = createClient();
  const code = "LSX" + Date.now().toString().slice(-7);
  const { error } = await supabase
    .from("production_orders")
    .insert({ code, product_id: productId, qty, status: "planned", qc_out: "pending" });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/san-xuat");
  return { ok: true };
}

export async function setProductionStatus(id: string, status: string): Promise<Res> {
  const supabase = createClient();
  const { error } = await supabase.from("production_orders").update({ status }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/san-xuat");
  return { ok: true };
}

export async function setQcOut(id: string, qc_out: string, qc_note: string | null): Promise<Res> {
  const supabase = createClient();
  const { error } = await supabase.from("production_orders").update({ qc_out, qc_note }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/san-xuat");
  return { ok: true };
}
