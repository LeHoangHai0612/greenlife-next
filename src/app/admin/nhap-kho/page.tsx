import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ReceiveStockForm } from "@/components/admin/receive-stock-form";
import type { Ingredient } from "@/lib/types";

export default async function ReceiveStockPage() {
  const supabase = createClient();
  const { data } = await supabase.from("ingredients").select("*").order("id").returns<Ingredient[]>();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">Nhập kho & QC đầu vào</h2>
        <Link href="/admin/kho" className="text-sm text-primary">
          ← Về Kho
        </Link>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Ghi nhận lô nhập (mã lô, HSD) và kết quả QC. QC <b>Đạt</b> mới cộng tồn kho và ghi nhật ký.
      </p>
      <ReceiveStockForm ingredients={data ?? []} />
    </div>
  );
}
