"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type Res = { ok: boolean; error?: string };

export async function createPurchaseOrder(
  supplierId: string,
  items: { ingredient_id: string; qty: number }[],
  note?: string,
): Promise<Res> {
  const valid = items.filter((i) => i.ingredient_id && i.qty > 0);
  if (!supplierId || valid.length === 0) return { ok: false, error: "Chọn NCC và ít nhất 1 nguyên liệu." };
  const supabase = createClient();
  const code = "PO" + Date.now().toString().slice(-7);
  const { data: po, error } = await supabase
    .from("purchase_orders")
    .insert({ code, supplier_id: supplierId, status: "sent", note: note ?? null })
    .select("id")
    .single();
  if (error || !po) return { ok: false, error: error?.message ?? "Lỗi" };
  const { error: e2 } = await supabase
    .from("purchase_order_items")
    .insert(valid.map((i) => ({ po_id: po.id, ingredient_id: i.ingredient_id, qty: i.qty })));
  if (e2) return { ok: false, error: e2.message };
  revalidatePath("/admin/dat-hang");
  return { ok: true };
}

export async function setPoStatus(id: string, status: string): Promise<Res> {
  const supabase = createClient();
  const { error } = await supabase.from("purchase_orders").update({ status }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/dat-hang");
  return { ok: true };
}
