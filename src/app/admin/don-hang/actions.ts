"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

export type Res = { ok: boolean; error?: string };

// Hủy đơn: gọi RPC cancel_order (hoàn kho + đảo điểm) rồi ghi audit
export async function cancelOrder(orderId: string, code: string): Promise<Res> {
  const supabase = createClient();
  const { error } = await supabase.rpc("cancel_order", { p_order_id: orderId });
  if (error) return { ok: false, error: error.message };
  await logAudit("Hủy đơn", "order", code);
  revalidatePath("/admin/don-hang");
  revalidatePath("/admin");
  return { ok: true };
}
