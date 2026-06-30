import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/admin-nav";
import { LogoutButton } from "@/components/auth/logout-button";

export const metadata = { title: "Quản trị — & GreenLife" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/dang-nhap?next=/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  // Phòng thủ nhiều lớp: bắt buộc vai trò nhân viên (không chỉ dựa vào middleware)
  if (!profile || !["staff", "manager", "admin"].includes(profile.role)) {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="kicker">Quản trị GreenLife</p>
          <h1 className="font-display text-2xl font-semibold">
            {profile?.full_name ?? "Nhân viên"}{" "}
            <span className="text-sm font-normal text-muted-foreground">· {profile?.role}</span>
          </h1>
        </div>
        <LogoutButton />
      </div>

      <div className="grid gap-6 md:grid-cols-[210px_1fr]">
        <aside className="md:sticky md:top-20 md:h-fit">
          <AdminNav />
        </aside>
        <section>{children}</section>
      </div>
    </div>
  );
}
