import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieItem = { name: string; value: string; options?: CookieOptions };

// Supabase client cho Server Components / Server Actions / Route Handlers
export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieItem[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Gọi từ Server Component (không set được cookie) — bỏ qua,
            // middleware sẽ lo việc refresh session.
          }
        },
      },
    },
  );
}
