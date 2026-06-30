import { createClient } from "@/lib/supabase/server";
import type { Category, Product } from "@/lib/types";

export { CATEGORY_EMOJI } from "@/lib/constants";

// Lấy danh mục (an toàn khi chưa cấu hình Supabase -> trả mảng rỗng)
export async function getCategories(): Promise<Category[]> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order");
    return (data as Category[]) ?? [];
  } catch {
    return [];
  }
}

// Lấy sản phẩm đang bán, kèm tên danh mục
export async function getProducts(): Promise<Product[]> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("products")
      .select("*, categories(name,slug), product_variants(id,product_id,label,price,sort)")
      .eq("is_active", true)
      .order("created_at");
    return (data as Product[]) ?? [];
  } catch {
    return [];
  }
}

// Ảnh dùng chung của website (key -> url)
export async function getSiteImages(): Promise<Record<string, string>> {
  try {
    const supabase = createClient();
    const { data } = await supabase.from("site_images").select("key, url");
    const map: Record<string, string> = {};
    (data ?? []).forEach((r: { key: string; url: string }) => (map[r.key] = r.url));
    return map;
  } catch {
    return {};
  }
}
