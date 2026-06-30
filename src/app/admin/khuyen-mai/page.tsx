import { createClient } from "@/lib/supabase/server";
import { PromoManager, type Promo } from "@/components/admin/promo-manager";

export default async function PromoPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("promotions")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Promo[]>();

  return (
    <div>
      <h2 className="mb-4 font-display text-xl font-semibold">Khuyến mãi & Voucher</h2>
      <PromoManager promos={data ?? []} />
    </div>
  );
}
