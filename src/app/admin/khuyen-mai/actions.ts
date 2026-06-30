"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PromoInput = {
  code: string;
  description?: string | null;
  kind: "percent" | "amount";
  value: number;
  min_total?: number;
};
export type Res = { ok: boolean; error?: string };

export async function createPromo(input: PromoInput): Promise<Res> {
  if (!input.code || !input.value) return { ok: false, error: "Cần mã và giá trị." };
  const supabase = createClient();
  const { error } = await supabase.from("promotions").insert({
    code: input.code.toUpperCase().trim(),
    description: input.description ?? null,
    kind: input.kind,
    value: input.value,
    min_total: input.min_total ?? 0,
    active: true,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/khuyen-mai");
  return { ok: true };
}

export async function togglePromo(id: string, active: boolean): Promise<Res> {
  const supabase = createClient();
  const { error } = await supabase.from("promotions").update({ active }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/khuyen-mai");
  return { ok: true };
}

export async function deletePromo(id: string): Promise<Res> {
  const supabase = createClient();
  const { error } = await supabase.from("promotions").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/khuyen-mai");
  return { ok: true };
}
