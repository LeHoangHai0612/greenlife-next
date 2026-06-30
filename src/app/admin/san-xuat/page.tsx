import { createClient } from "@/lib/supabase/server";
import { ProductionManager, type ProdOrder } from "@/components/admin/production-manager";

export default async function ProductionPage() {
  const supabase = createClient();
  const [{ data: orders }, { data: products }] = await Promise.all([
    supabase
      .from("production_orders")
      .select("id, code, qty, status, qc_out, qc_note, products(name)")
      .order("created_at", { ascending: false })
      .returns<ProdOrder[]>(),
    supabase.from("products").select("id, name").eq("is_active", true).order("name"),
  ]);

  return (
    <div>
      <h2 className="mb-1 font-display text-xl font-semibold">Sản xuất & QC đầu ra</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Lập lệnh sản xuất theo đơn/ tồn kho thành phẩm; QC đầu ra <b>Đạt</b> mới nhập kho.
      </p>
      <ProductionManager orders={orders ?? []} products={products ?? []} />
    </div>
  );
}
