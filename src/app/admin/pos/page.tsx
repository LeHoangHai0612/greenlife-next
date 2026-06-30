import { getCategories, getProducts } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { PosView } from "@/components/admin/pos-view";

export default async function PosPage() {
  const [categories, products] = await Promise.all([getCategories(), getProducts()]);
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user?.id ?? "")
    .single();

  return (
    <div>
      <h2 className="mb-4 font-display text-xl font-semibold">Bán hàng tại quầy (POS)</h2>
      <PosView
        categories={categories}
        products={products}
        servedBy={profile?.full_name ?? "Nhân viên"}
      />
    </div>
  );
}
