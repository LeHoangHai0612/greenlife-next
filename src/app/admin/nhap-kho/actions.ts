"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ReceiveInput = {
  ingredient_id: string;
  batch_code: string;
  qty: number;
  expiry?: string | null;
  qc_status: "passed" | "rejected" | "pending";
  qc_note?: string | null;
};

export type ReceiveResult = { ok: boolean; error?: string };

// Nhập kho 1 lô nguyên liệu + QC đầu vào (RPC receive_stock)
export async function receiveStock(input: ReceiveInput): Promise<ReceiveResult> {
  if (!input.ingredient_id || !input.batch_code || !input.qty)
    return { ok: false, error: "Thiếu thông tin lô nhập." };

  const supabase = createClient();
  const { error } = await supabase.rpc("receive_stock", {
    p_ingredient_id: input.ingredient_id,
    p_batch_code: input.batch_code,
    p_qty: input.qty,
    p_expiry: input.expiry || null,
    p_qc_status: input.qc_status,
    p_qc_note: input.qc_note || null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/kho");
  return { ok: true };
}
