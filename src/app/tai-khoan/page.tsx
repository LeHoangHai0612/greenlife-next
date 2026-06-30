import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/auth/logout-button";
import { formatVnd } from "@/lib/utils";
import type { Order, Profile } from "@/lib/types";

export const metadata = { title: "Tài khoản — & GreenLife" };

export default async function AccountPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/dang-nhap?next=/tai-khoan");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .returns<Order[]>();

  const isStaff = profile && ["staff", "manager", "admin"].includes(profile.role);

  return (
    <div className="mx-auto max-w-2xl px-6 pb-24 pt-16">
      <div className="flex items-start justify-between">
        <div>
          <p className="kicker">Thành viên</p>
          <h1 className="mt-2 font-display text-4xl font-semibold">
            {profile?.full_name ?? "Khách"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
        </div>
        <LogoutButton />
      </div>

      {/* thẻ điểm/hạng */}
      <div className="mt-8 grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-paper p-5 text-center">
          <div className="font-display text-3xl font-bold text-primary">{profile?.points ?? 0}</div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Điểm</div>
        </div>
        <div className="rounded-2xl border border-border bg-paper p-5 text-center">
          <div className="font-display text-2xl font-bold">{profile?.rank ?? "Mới"}</div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Hạng</div>
        </div>
        <div className="rounded-2xl border border-border bg-paper p-5 text-center">
          <div className="font-display text-xl font-bold">{formatVnd(profile?.total_spend ?? 0)}</div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Chi tiêu</div>
        </div>
      </div>

      {isStaff && (
        <Link
          href="/admin"
          className="mt-6 block rounded-2xl border border-primary bg-primary/5 p-4 text-center text-sm font-medium text-primary"
        >
          → Vào trang quản trị
        </Link>
      )}

      {/* lịch sử đơn */}
      <h2 className="mb-3 mt-10 font-display text-2xl font-semibold">Lịch sử đơn hàng</h2>
      <div className="overflow-hidden rounded-2xl border border-border bg-paper">
        {orders && orders.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="p-3">Mã</th>
                <th className="p-3">Ngày</th>
                <th className="p-3">Thanh toán</th>
                <th className="p-3 text-right">Tổng</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-border last:border-0">
                  <td className="p-3 font-medium">{o.code}</td>
                  <td className="p-3 text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="p-3">{o.payment}</td>
                  <td className="p-3 text-right text-primary">{formatVnd(o.total_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="p-6 text-center text-sm text-muted-foreground">Chưa có đơn hàng nào.</p>
        )}
      </div>
    </div>
  );
}
