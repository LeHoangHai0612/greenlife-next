"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

export type Res = { ok: boolean; error?: string };

const ROLES = ["customer", "staff", "manager", "admin"];

// Đổi vai trò người dùng (chỉ admin/manager mới được phép)
export async function setRole(userId: string, role: string): Promise<Res> {
  if (!ROLES.includes(role)) return { ok: false, error: "Vai trò không hợp lệ" };
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user?.id ?? "").single();
  if (!me || !["manager", "admin"].includes(me.role))
    return { ok: false, error: "Chỉ quản lý/admin được đổi vai trò" };

  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) return { ok: false, error: error.message };
  await logAudit("Đổi vai trò", "profile", `${userId} → ${role}`);
  revalidatePath("/admin/nhan-vien");
  return { ok: true };
}
