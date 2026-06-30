"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();
  return (
    <button
      onClick={async () => {
        await supabase.auth.signOut();
        router.push("/");
        router.refresh();
      }}
      className="rounded-full border border-foreground px-5 py-2.5 text-[11px] uppercase tracking-[0.15em] transition-colors hover:bg-foreground hover:text-background"
    >
      Đăng xuất
    </button>
  );
}
