import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SiteImageManager, type SiteImage } from "@/components/admin/site-image-manager";

export default async function SiteImagesPage() {
  const supabase = createClient();
  const { data } = await supabase.from("site_images").select("*").order("key").returns<SiteImage[]>();

  return (
    <div>
      <h2 className="mb-1 font-display text-xl font-semibold">Ảnh website</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Đổi ảnh trang chủ (hero, câu chuyện) và trang Giới thiệu. Ảnh <b>sản phẩm</b> đổi tại{" "}
        <Link href="/admin/san-pham" className="text-primary">Sản phẩm</Link>.
      </p>
      <SiteImageManager images={data ?? []} />
    </div>
  );
}
