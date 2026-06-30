import Link from "next/link";

const LINKS = [
  { href: "/", label: "Trang chủ" },
  { href: "/gioi-thieu", label: "Về GreenLife" },
  { href: "/thuc-don", label: "Thực đơn" },
  { href: "/tin-tuc", label: "Tin tức" },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-paper px-6 py-12 text-center">
      <div className="font-display text-3xl font-bold">&amp;</div>
      <div className="mb-3 text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
        GreenLife
      </div>
      <p className="text-xs text-muted-foreground">
        Nước uống dinh dưỡng an toàn · Hà Nội
      </p>
      <p className="text-xs text-muted-foreground">
        Hotline 0123 456 789 · greenlife@example.com
      </p>
      <div className="mt-4 flex justify-center gap-4 text-[11px] uppercase tracking-[0.15em]">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="text-muted-foreground hover:text-primary">
            {l.label}
          </Link>
        ))}
      </div>
    </footer>
  );
}
