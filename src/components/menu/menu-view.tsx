"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";
import { CATEGORY_EMOJI } from "@/lib/constants";
import { formatVnd } from "@/lib/utils";
import { useCart } from "@/lib/store/cart";
import { CartBar } from "@/components/menu/cart-bar";
import type { Category, Product, ProductVariant } from "@/lib/types";

function defaultVariant(p: Product): ProductVariant | null {
  const vs = p.product_variants ?? [];
  if (vs.length === 0) return null;
  return [...vs].sort((a, b) => a.sort - b.sort).find((v) => v.sort === 2) ?? vs[0];
}

export function MenuView({
  categories,
  products,
}: {
  categories: Category[];
  products: Product[];
}) {
  const [active, setActive] = useState("all");
  const [sizes, setSizes] = useState<Record<string, string>>({});
  const add = useCart((s) => s.add);

  const tabs = [{ name: "Tất cả", slug: "all" }, ...categories.map((c) => ({ name: c.name, slug: c.slug }))];
  const list = products.filter((p) => active === "all" || p.categories?.slug === active);

  function addToCart(p: Product) {
    const vs = [...(p.product_variants ?? [])].sort((a, b) => a.sort - b.sort);
    const chosenId = sizes[p.id] ?? defaultVariant(p)?.id ?? null;
    const v = vs.find((x) => x.id === chosenId) ?? null;
    add({
      productId: p.id,
      variantId: v?.id ?? null,
      name: p.name,
      label: v?.label ?? null,
      price: v?.price ?? p.price,
    });
  }

  return (
    <div className="pb-32">
      <div className="mb-2 flex flex-wrap justify-center gap-x-6 gap-y-2 px-6">
        {tabs.map((t) => (
          <button
            key={t.slug}
            onClick={() => setActive(t.slug)}
            className={`border-b-2 py-1.5 text-[12px] uppercase tracking-[0.15em] transition-colors ${
              active === t.slug ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      <div className="mx-auto max-w-2xl px-4">
        {list.map((p, i) => {
          const vs = [...(p.product_variants ?? [])].sort((a, b) => a.sort - b.sort);
          const chosenId = sizes[p.id] ?? defaultVariant(p)?.id ?? null;
          const chosen = vs.find((x) => x.id === chosenId);
          const shownPrice = chosen?.price ?? p.price;
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.03 }}
              className="flex items-center gap-4 border-b border-border py-4"
            >
              {p.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image_url} alt={p.name} className="h-20 w-20 flex-none rounded-full object-cover" />
              ) : (
                <div className="flex h-20 w-20 flex-none items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff,#ece6da)] text-3xl">
                  {CATEGORY_EMOJI[p.categories?.slug ?? ""] ?? "🥤"}
                </div>
              )}
              <div className="flex-1">
                <div className="font-display text-lg font-semibold leading-tight">{p.name}</div>
                <div className="my-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                  {p.categories?.name} · {p.calo} kcal
                </div>
                {/* chọn size */}
                {vs.length > 0 && (
                  <div className="mb-1 flex gap-1.5">
                    {vs.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setSizes((s) => ({ ...s, [p.id]: v.id }))}
                        className={`rounded-full border px-2.5 py-1 text-[10px] ${
                          chosenId === v.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                        }`}
                      >
                        {v.label.split(" ")[0]}
                      </button>
                    ))}
                  </div>
                )}
                <div className="text-primary">{formatVnd(shownPrice)}</div>
              </div>
              <button
                aria-label={`Thêm ${p.name}`}
                onClick={() => addToCart(p)}
                className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-foreground text-background transition-transform active:scale-90"
              >
                <Plus className="h-5 w-5" />
              </button>
            </motion.div>
          );
        })}
        {list.length === 0 && <p className="py-16 text-center text-sm text-muted-foreground">Chưa có món nào.</p>}
      </div>

      <CartBar />
    </div>
  );
}
