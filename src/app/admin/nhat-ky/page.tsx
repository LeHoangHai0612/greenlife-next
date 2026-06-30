import { createClient } from "@/lib/supabase/server";

type Log = {
  id: string;
  actor_name: string | null;
  action: string;
  entity: string | null;
  detail: string | null;
  created_at: string;
};

export default async function AuditPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<Log[]>();

  return (
    <div>
      <h2 className="mb-1 font-display text-xl font-semibold">Nhật ký thao tác</h2>
      <p className="mb-4 text-sm text-muted-foreground">Lịch sử hành động của nhân viên trên hệ thống (audit log).</p>
      <div className="overflow-hidden rounded-2xl border border-border bg-paper">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="p-3">Thời gian</th>
              <th className="p-3">Người thực hiện</th>
              <th className="p-3">Hành động</th>
              <th className="p-3">Đối tượng</th>
              <th className="p-3">Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((l) => (
              <tr key={l.id} className="border-b border-border last:border-0">
                <td className="p-3 text-muted-foreground">{new Date(l.created_at).toLocaleString("vi-VN")}</td>
                <td className="p-3">{l.actor_name ?? "—"}</td>
                <td className="p-3 font-medium">{l.action}</td>
                <td className="p-3">{l.entity}</td>
                <td className="p-3 text-muted-foreground">{l.detail}</td>
              </tr>
            ))}
            {(!data || data.length === 0) && (
              <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Chưa có nhật ký.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
