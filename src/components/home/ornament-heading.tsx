import { Reveal } from "@/components/motion/reveal";

// Tiêu đề nằm trong hoạ tiết đường mảnh (ellipse + tia sao) — kiểu &TEA
export function OrnamentHeading({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <Reveal className="relative mx-auto flex max-w-3xl flex-col items-center px-6 py-20 text-center">
      {/* hoạ tiết ellipse + tia sao */}
      <svg
        className="pointer-events-none absolute left-1/2 top-1/2 -z-0 h-[260px] w-[680px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2"
        viewBox="0 0 680 260"
        fill="none"
        aria-hidden
      >
        <ellipse cx="340" cy="130" rx="320" ry="118" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.7" />
        <path d="M600 60 l6 26 l26 6 l-26 6 l-6 26 l-6 -26 l-26 -6 l26 -6 z" fill="hsl(var(--primary))" opacity="0.8" />
        <line x1="340" y1="6" x2="340" y2="48" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.7" />
      </svg>

      <div className="relative z-10">
        <div className="font-display text-3xl font-bold">&amp;</div>
        <h2 className="mt-2 font-display text-3xl font-semibold md:text-4xl">{title}</h2>
        {subtitle && (
          <div className="mt-1 font-display text-lg italic tracking-wide text-primary">{subtitle}</div>
        )}
        {children && <div className="mt-5 text-sm leading-relaxed text-muted-foreground">{children}</div>}
      </div>
    </Reveal>
  );
}
