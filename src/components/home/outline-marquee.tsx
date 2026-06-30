"use client";

// Dải chữ serif khổng lồ VIỀN RỖNG chạy ngang — đặc trưng editorial kiểu &TEA
export function OutlineMarquee({ text = "GREENLIFE · TEA IN LIFE ·" }: { text?: string }) {
  const items = Array(6).fill(text);
  return (
    <div className="overflow-hidden py-10">
      <div className="flex w-max animate-marquee whitespace-nowrap">
        {items.map((t, i) => (
          <span
            key={i}
            className="mx-6 font-display text-[12vw] font-semibold leading-none tracking-tight text-transparent md:text-[8vw]"
            style={{ WebkitTextStroke: "1px hsl(var(--muted-foreground) / 0.45)" }}
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
