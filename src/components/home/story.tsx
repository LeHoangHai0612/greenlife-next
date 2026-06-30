import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";

const PANELS = [
  {
    img: "https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=1000&q=80",
    kk: "Our promise",
    title: "Tự nhiên, trọn vẹn dinh dưỡng.",
    text: "Mỗi công thức được cân đo định lượng và kiểm soát chất lượng theo lô — giữ trọn hương vị và lợi ích của thiên nhiên trong từng ly.",
    cta: { href: "/thuc-don", label: "Đặt món ngay", variant: "default" as const },
    reverse: false,
  },
  {
    img: "https://images.unsplash.com/photo-1601314002592-b8734bca6604?auto=format&fit=crop&w=1000&q=80",
    kk: "15 thức uống",
    title: "Kombucha · Detox · Trà · Sữa hạt",
    text: "Nguyên liệu hữu cơ rõ nguồn gốc, không chất bảo quản. Khám phá thực đơn được tuyển chọn cho lối sống lành mạnh.",
    cta: { href: "/gioi-thieu", label: "Về GreenLife", variant: "ghost" as const },
    reverse: true,
  },
];

export function Story({ img1, img2 }: { img1?: string; img2?: string }) {
  const imgs = [img1, img2];
  return (
    <>
      {PANELS.map((p, i) => (
        <section
          key={i}
          className={`flex min-h-[80vh] flex-col ${p.reverse ? "md:flex-row-reverse" : "md:flex-row"}`}
        >
          <div
            className="min-h-[52vh] flex-1 bg-cover bg-center"
            style={{ backgroundImage: `linear-gradient(rgba(0,0,0,.06),rgba(0,0,0,.06)),url('${imgs[i] || p.img}')` }}
          />
          <div className="flex flex-1 flex-col justify-center gap-4 bg-background px-8 py-16 md:px-16">
            <Reveal>
              <p className="kicker">{p.kk}</p>
              <h2 className="mt-3 font-display text-4xl font-semibold leading-tight">{p.title}</h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">{p.text}</p>
              <div className="mt-6">
                <Button asChild variant={p.cta.variant}>
                  <Link href={p.cta.href}>{p.cta.label}</Link>
                </Button>
              </div>
            </Reveal>
          </div>
        </section>
      ))}
    </>
  );
}
