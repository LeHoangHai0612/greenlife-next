import { createClient } from "@/lib/supabase/server";
import { getCategories } from "@/lib/data";
import { ProductManager } from "@/components/admin/product-manager";
import type { Product } from "@/lib/types";

export default async function AdminProductsPage() {
  const supabase = createClient();
  const [{ data: products }, categories] = await Promise.all([
    supabase.from("products").select("*, categories(name,slug)").order("created_at").returns<Product[]>(),
    getCategories(),
  ]);

  return <ProductManager products={products ?? []} categories={categories} />;
}
