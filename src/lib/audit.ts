import { createClient } from "@/lib/supabase/server";

// Ghi nhật ký thao tác admin (NFR-03). Gọi từ Server Action.
export async function logAudit(action: string, entity: string, detail?: string) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    let actorName: string | null = null;
    if (user) {
      const { data } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
      actorName = data?.full_name ?? user.email ?? null;
    }
    await supabase.from("audit_log").insert({
      actor: user?.id ?? null,
      actor_name: actorName,
      action,
      entity,
      detail: detail ?? null,
    });
  } catch {
    // không để lỗi audit làm hỏng nghiệp vụ chính
  }
}
