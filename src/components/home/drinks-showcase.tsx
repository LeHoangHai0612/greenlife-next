"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";
import { CATEGORY_EMOJI } from "@/lib/constants";
import { formatVnd } from "@/lib/utils";
import type { Category, Product } from "@/lib/types";

export function DrinksShowcase({
  categories,
  products,
}: {
  categories: Category[];
  products: Product[];
}) {
  const [active, setActive] = useState<string>("all");

  const tabs = [{ name: "Tất cả", slug: "all" }, ...categories.map((c) => ({ name: c.name, slug: c.slug }))];
  const filtered = products
    .filter((p) => active === "all" || p.categories?.slug === active)
    .slice(0, 8);

  return (
    <section className="border-t border-border bg-paper px-6 py-24">
      <Reveal className="mx-auto mb-9 max-w-xl text-center">
        <p className="kicker">Our drinks</p>
        <h2 className="mt-3 font-display text-4xl font-semibold">Tuyển chọn thức uống</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Từ kombucha lên men tự nhiên đến detox rau củ tươi — mỗi ly đều dùng nguyên liệu hữu cơ
          rõ nguồn gốc, định lượng chuẩn theo công thức.
        </p>
      </Reveal>

      {/* tabs */}
      <div className="mb-10 flex flex-wrap justify-center gap-2.5">
        {tabs.map((t) => (
          <button
            key={t.slug}
            onClick={() => setActive(t.slug)}
            className={`rounded-full border px-5 py-2.5 text-[10px] uppercase tracking-[0.2em] transition-colors ${
              active === t.slug
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      {/* grid */}
      <motion.div layout className="mx-auto grid max-w-[1080px] grid-cols-2 gap-5 md:grid-cols-4">
        <AnimatePresence mode="popLayout">
          {filtered.map((p) => (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.35 }}
              whileHover={{ y: -7 }}
              className="group rounded-[22px] border border-border bg-background p-6 text-center"
            >
              {p.image_url ? (
                <div className="mx-auto mb-4 h-24 w-24 overflow-hidden rounded-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.image_url} alt={p.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                </div>
              ) : (
                <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff,#ece6da)] text-5xl transition-transform duration-500 group-hover:scale-110">
                  {CATEGORY_EMOJI[p.categories?.slug ?? ""] ?? "🥤"}
                </div>
              )}
              <div className="text-[9px] uppercase tracking-[0.2em] text-primary">
                {p.categories?.name}
              </div>
              <h3 className="mt-1.5 min-h-[42px] font-display text-base font-semibold leading-tight">
                {p.name}
              </h3>
              <div className="text-[11px] text-muted-foreground">
                {p.calo} kcal · HSD {p.hsd ?? "—"}
              </div>
              <div className="mt-2.5 font-semibold">{formatVnd(p.price)}</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {products.length === 0 && (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Chưa có dữ liệu sản phẩm — hãy cấu hình Supabase và chạy <code>schema.sql</code>.
        </p>
      )}

      <div className="mt-11 text-center">
        <Button asChild>
          <Link href="/thuc-don">Xem toàn bộ thực đơn</Link>
        </Button>
      </div>
    </section>
  );
}
