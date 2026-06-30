const WORDS = ["GreenLife", "Tươi mỗi ngày", "Không chất bảo quản", "Hữu cơ"];

export function Marquee() {
  const items = [...WORDS, ...WORDS, ...WORDS, ...WORDS];
  return (
    <div className="overflow-hidden border-y border-border bg-paper py-4">
      <div className="flex w-max animate-marquee whitespace-nowrap">
        {items.map((w, i) => (
          <span key={i} className="mx-7 font-display text-2xl font-semibold uppercase tracking-wide">
            <span className="mr-7 text-primary">·</span>
            {w}
          </span>
        ))}
      </div>
    </div>
  );
}
