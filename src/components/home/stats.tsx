import { Counter } from "@/components/motion/counter";
import { Reveal } from "@/components/motion/reveal";

const ITEMS = [
  { to: 15, suffix: "+", label: "Thức uống dinh dưỡng" },
  { to: 100, suffix: "%", label: "Nguyên liệu hữu cơ" },
  { to: 0, suffix: "", label: "Chất bảo quản" },
  { to: 1000, suffix: "+", label: "Khách hàng thân thiết" },
];

export function Stats() {
  return (
    <section className="border-y border-border bg-paper px-6 py-16">
      <Reveal className="mx-auto grid max-w-4xl grid-cols-2 gap-8 text-center md:grid-cols-4">
        {ITEMS.map((it) => (
          <div key={it.label}>
            <div className="font-display text-4xl font-bold text-primary md:text-5xl">
              <Counter to={it.to} suffix={it.suffix} />
            </div>
            <div className="mt-2 text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
              {it.label}
            </div>
          </div>
        ))}
      </Reveal>
    </section>
  );
}
