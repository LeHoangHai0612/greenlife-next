import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { getSiteImages } from "@/lib/data";

export const metadata = { title: "Về GreenLife — & GreenLife" };

const VALUES = [
  { ic: "🌱", t: "Nguyên liệu sạch", d: "Hợp tác trang trại hữu cơ; mỗi lô nguyên liệu được kiểm tra màu sắc, mùi, độ tươi (QC) trước khi nhập kho." },
  { ic: "⚖️", t: "Định lượng chuẩn", d: "Mỗi công thức (BOM) xác định rõ khối lượng nguyên liệu, giữ hương vị ổn định và minh bạch dinh dưỡng." },
  { ic: "♻️", t: "Bền vững", d: "Ưu tiên ly giấy, ống hút sinh học; giảm rác thải nhựa, đồng hành cùng lối sống xanh." },
];

export default async function AboutPage() {
  const images = await getSiteImages();

  return (
    <>
      <div
        className="flex min-h-[44vh] items-end bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,.25),rgba(0,0,0,.35)),url('${images.about_hero || "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=1200&q=80"}')`,
        }}
      >
        <div className="px-6 pb-10 text-paper">
          <p className="text-[11px] uppercase tracking-[0.35em]">Về chúng tôi</p>
          <h1 className="mt-2 font-display text-4xl font-semibold md:text-6xl">Câu chuyện GreenLife</h1>
        </div>
      </div>

      <section className="px-6 py-20 text-center">
        <Reveal>
          <div className="mx-auto max-w-2xl">
            <div className="font-display text-3xl font-semibold leading-snug md:text-4xl">
              Mỗi ly là một liều thuốc thiên nhiên.
            </div>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              GreenLife Drink ra đời từ mong muốn mang đến những thức uống vừa ngon vừa lành — nguyên liệu
              hữu cơ rõ nguồn gốc, không chất bảo quản, được định lượng và kiểm soát chất lượng chặt chẽ.
              Chúng tôi tin rằng sức khỏe bắt đầu từ những lựa chọn nhỏ mỗi ngày.
            </p>
          </div>
        </Reveal>

        <div className="mx-auto mt-14 grid max-w-4xl gap-5 md:grid-cols-3">
          {VALUES.map((v, i) => (
            <Reveal key={v.t} delay={i * 0.1}>
              <div className="h-full rounded-2xl border border-border bg-paper p-7 text-left">
                <div className="text-3xl">{v.ic}</div>
                <h3 className="mt-3 font-display text-xl font-semibold">{v.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{v.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="px-6 pb-24 text-center">
        <Reveal>
          <div className="font-display text-3xl font-semibold">Tầm nhìn</div>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Trở thành chuỗi cửa hàng nước uống dinh dưỡng an toàn hàng đầu tại Hà Nội, ứng dụng công nghệ để
            quản lý chất lượng và nâng cao trải nghiệm khách hàng — hướng tới mô hình kinh doanh bền vững.
          </p>
          <div className="mt-7">
            <Button asChild>
              <Link href="/thuc-don">Khám phá thực đơn</Link>
            </Button>
          </div>
        </Reveal>
      </section>
    </>
  );
}
