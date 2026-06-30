"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

export function AuthForm() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setErr("");
    setInfo("");
    if (!email || !password || (mode === "register" && !fullName)) {
      setErr("Vui lòng nhập đủ thông tin.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/tai-khoan");
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, phone } },
        });
        if (error) throw error;
        // Nếu Supabase bật xác nhận email -> chưa có session
        if (!data.session) {
          setInfo("Đã gửi email xác nhận. Vui lòng kiểm tra hộp thư rồi đăng nhập.");
          setMode("login");
        } else {
          router.push("/tai-khoan");
          router.refresh();
        }
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Có lỗi xảy ra.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mx-auto mt-20 w-full max-w-sm rounded-3xl border border-border bg-paper p-8"
    >
      <div className="text-center font-display text-3xl font-bold">&amp;</div>
      <h1 className="mt-1 text-center font-display text-2xl font-semibold">
        {mode === "login" ? "Đăng nhập" : "Đăng ký"}
      </h1>
      <p className="mb-6 mt-1 text-center text-xs text-muted-foreground">
        {mode === "login"
          ? "Đăng nhập để tích điểm cho mỗi đơn hàng"
          : "Tạo tài khoản thành viên GreenLife"}
      </p>

      {err && <p className="mb-3 text-center text-sm text-red-600">{err}</p>}
      {info && <p className="mb-3 text-center text-sm text-primary">{info}</p>}

      <div className="space-y-3">
        {mode === "register" && (
          <>
            <input
              className="w-full border-b border-border bg-transparent py-3 text-sm outline-none focus:border-primary"
              placeholder="Họ tên"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <input
              className="w-full border-b border-border bg-transparent py-3 text-sm outline-none focus:border-primary"
              placeholder="Số điện thoại (tuỳ chọn)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </>
        )}
        <input
          type="email"
          className="w-full border-b border-border bg-transparent py-3 text-sm outline-none focus:border-primary"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          className="w-full border-b border-border bg-transparent py-3 text-sm outline-none focus:border-primary"
          placeholder="Mật khẩu"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
      </div>

      <button
        disabled={loading}
        onClick={submit}
        className="mt-6 w-full rounded-full bg-foreground py-4 text-[12px] uppercase tracking-[0.2em] text-background disabled:opacity-60"
      >
        {loading ? "Đang xử lý…" : mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
      </button>

      <button
        onClick={() => {
          setMode(mode === "login" ? "register" : "login");
          setErr("");
          setInfo("");
        }}
        className="mt-3 w-full text-center text-xs text-primary"
      >
        {mode === "login" ? "Chưa có tài khoản? Đăng ký" : "Đã có tài khoản? Đăng nhập"}
      </button>
    </motion.div>
  );
}
