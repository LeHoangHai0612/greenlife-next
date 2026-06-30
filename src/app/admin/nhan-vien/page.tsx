import { createClient } from "@/lib/supabase/server";
import { StaffManager, type Member } from "@/components/admin/staff-manager";

export default async function StaffPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role")
    .order("role")
    .returns<Member[]>();

  return (
    <div>
      <h2 className="mb-1 font-display text-xl font-semibold">Quản lý nhân viên & phân quyền</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Phân quyền theo vai trò (RBAC). Chỉ <b>Quản lý/Admin</b> mới đổi được vai trò.
      </p>
      <StaffManager members={data ?? []} />
    </div>
  );
}
