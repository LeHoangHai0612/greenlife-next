import { createClient } from "@/lib/supabase/server";
import { PurchaseManager, type PoRow } from "@/components/admin/purchase-manager";
import type { Ingredient } from "@/lib/types";

export default async function PurchasePage() {
  const supabase = createClient();
  const [{ data: ingredients }, { data: suppliers }, { data: pos }] = await Promise.all([
    supabase.from("ingredients").select("*").order("id").returns<Ingredient[]>(),
    supabase.from("suppliers").select("id, code, name").order("code"),
    supabase
      .from("purchase_orders")
      .select("id, code, status, created_at, suppliers(name)")
      .order("created_at", { ascending: false })
      .returns<PoRow[]>(),
  ]);

  return (
    <div>
      <h2 className="mb-4 font-display text-xl font-semibold">Đặt hàng nguyên liệu</h2>
      <PurchaseManager ingredients={ingredients ?? []} suppliers={suppliers ?? []} pos={pos ?? []} />
    </div>
  );
}
