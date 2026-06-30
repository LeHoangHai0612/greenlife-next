import { createClient } from "@/lib/supabase/server";
import { formatVnd } from "@/lib/utils";

type Cus = {
  id: string;
  code: string | null;
  phone: string;
  name: string;
  rank: string;
  points: number;
  total_spend: number;
  last_order: string | null;
};

const pill: Record<string, string> = {
  VIP: "bg-amber-100 text-amber-800",
  "Thân thiết": "bg-blue-100 text-blue-700",
  Mới: "bg-stone-200 text-stone-600",
};

export default async function CustomersPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("customers")
    .select("*")
    .order("total_spend", { ascending: false })
    .returns<Cus[]>();
  const list = data ?? [];

  return (
    <div>
      <h2 className="mb-3 font-display text-xl font-semibold">
        Khách hàng CRM <span className="text-sm font-normal text-muted-foreground">· {list.length} khách</span>
      </h2>
      <div className="overflow-hidden rounded-2xl border border-border bg-paper">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="p-3">Mã</th>
              <th className="p-3">Họ tên</th>
              <th className="p-3">SĐT</th>
              <th className="p-3">Hạng</th>
              <th className="p-3 text-right">Chi tiêu</th>
              <th className="p-3 text-right">Điểm</th>
              <th className="p-3">Mua cuối</th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0">
                <td className="p-3">{c.code}</td>
                <td className="p-3 font-medium">{c.name}</td>
                <td className="p-3 text-muted-foreground">{c.phone}</td>
                <td className="p-3">
                  <span className={`rounded-full px-2.5 py-1 text-[10px] uppercase ${pill[c.rank] ?? pill["Mới"]}`}>
                    {c.rank}
                  </span>
                </td>
                <td className="p-3 text-right">{formatVnd(c.total_spend)}</td>
                <td className="p-3 text-right font-semibold text-primary">{c.points}</td>
                <td className="p-3 text-muted-foreground">
                  {c.last_order ? new Date(c.last_order).toLocaleDateString("vi-VN") : "—"}
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted-foreground">
                  Chưa có khách — hãy chạy <code>extend.sql</code> để nạp dữ liệu demo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
