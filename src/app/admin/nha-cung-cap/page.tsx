import { createClient } from "@/lib/supabase/server";

type Supplier = {
  id: string;
  code: string | null;
  name: string;
  ingredient_group: string | null;
  contact: string | null;
  rating: string | null;
};

export default async function SuppliersPage() {
  const supabase = createClient();
  const { data } = await supabase.from("suppliers").select("*").order("code").returns<Supplier[]>();
  const list = data ?? [];

  return (
    <div>
      <h2 className="mb-3 font-display text-xl font-semibold">Nhà cung cấp</h2>
      <div className="overflow-hidden rounded-2xl border border-border bg-paper">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="p-3">Mã</th>
              <th className="p-3">Nhà cung cấp</th>
              <th className="p-3">Nhóm nguyên liệu</th>
              <th className="p-3">Liên hệ</th>
              <th className="p-3">Đánh giá</th>
            </tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id} className="border-b border-border last:border-0">
                <td className="p-3">{s.code}</td>
                <td className="p-3 font-medium">{s.name}</td>
                <td className="p-3">{s.ingredient_group}</td>
                <td className="p-3 text-muted-foreground">{s.contact}</td>
                <td className="p-3">{s.rating}</td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  Chưa có nhà cung cấp — hãy chạy <code>extend.sql</code>.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
