"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type Res = { ok: boolean; error?: string };

export async function updateSiteImage(key: string, url: string): Promise<Res> {
  if (!url) return { ok: false, error: "Thiếu URL ảnh" };
  const supabase = createClient();
  const { error } = await supabase.from("site_images").update({ url }).eq("key", key);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}
