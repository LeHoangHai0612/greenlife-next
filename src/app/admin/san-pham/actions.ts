"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

export type ProductInput = {
  name: string;
  description?: string | null;
  price: number;
  cost?: number;
  calo?: number;
  hsd?: string | null;
  category_id?: string | null;
  image_url?: string | null;
  is_active?: boolean;
};

export type ActionResult = { ok: boolean; error?: string };

function refresh() {
  revalidatePath("/admin/san-pham");
  revalidatePath("/thuc-don");
  revalidatePath("/");
}

export async function createProduct(input: ProductInput): Promise<ActionResult> {
  if (!input.name || !input.price) return { ok: false, error: "Cần tên và giá." };
  const supabase = createClient();
  const { error } = await supabase.from("products").insert({
    name: input.name,
    description: input.description ?? null,
    price: input.price,
    cost: input.cost ?? 0,
    calo: input.calo ?? 0,
    hsd: input.hsd ?? null,
    category_id: input.category_id ?? null,
    image_url: input.image_url ?? null,
    is_active: input.is_active ?? true,
  });
  if (error) return { ok: false, error: error.message };
  await logAudit("Thêm sản phẩm", "product", input.name);
  refresh();
  return { ok: true };
}

export async function updateProduct(id: string, input: ProductInput): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("products")
    .update({
      name: input.name,
      description: input.description ?? null,
      price: input.price,
      cost: input.cost ?? 0,
      calo: input.calo ?? 0,
      hsd: input.hsd ?? null,
      category_id: input.category_id ?? null,
      image_url: input.image_url ?? null,
      is_active: input.is_active ?? true,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logAudit("Sửa sản phẩm", "product", `${input.name} · ${input.price}đ`);
  refresh();
  return { ok: true };
}

export async function toggleActive(id: string, active: boolean): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.from("products").update({ is_active: active }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logAudit(active ? "Mở bán sản phẩm" : "Ẩn sản phẩm", "product", id);
  refresh();
  return { ok: true };
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logAudit("Xóa sản phẩm", "product", id);
  refresh();
  return { ok: true };
}
