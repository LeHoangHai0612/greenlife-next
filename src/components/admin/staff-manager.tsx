"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setRole } from "@/app/admin/nhan-vien/actions";

export type Member = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string;
};

const ROLES = [
  { v: "customer", l: "Khách hàng" },
  { v: "staff", l: "Nhân viên" },
  { v: "manager", l: "Quản lý" },
  { v: "admin", l: "Admin" },
];

export function StaffManager({ members }: { members: Member[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();

  function change(id: string, role: string) {
    setMsg("");
    start(async () => {
      const res = await setRole(id, role);
      if (!res.ok) setMsg(res.error ?? "Lỗi");
      router.refresh();
    });
  }

  return (
    <div>
      {msg && <p className="mb-3 text-sm text-red-600">{msg}</p>}
      <div className="overflow-hidden rounded-2xl border border-border bg-paper">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="p-3">Họ tên</th>
              <th className="p-3">SĐT</th>
              <th className="p-3">Vai trò</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b border-border last:border-0">
                <td className="p-3 font-medium">{m.full_name ?? "(chưa đặt tên)"}</td>
                <td className="p-3 text-muted-foreground">{m.phone ?? "—"}</td>
                <td className="p-3">
                  <select
                    value={m.role}
                    disabled={pending}
                    onChange={(e) => change(m.id, e.target.value)}
                    className="rounded-lg border border-border bg-paper px-2 py-1.5 text-sm"
                  >
                    {ROLES.map((r) => (
                      <option key={r.v} value={r.v}>{r.l}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">Chưa có người dùng.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
