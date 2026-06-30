import { AuthForm } from "@/components/auth/auth-form";

export const metadata = { title: "Đăng nhập — & GreenLife" };

export default function LoginPage() {
  return (
    <div className="min-h-[70vh] px-6 pb-24">
      <AuthForm />
    </div>
  );
}
