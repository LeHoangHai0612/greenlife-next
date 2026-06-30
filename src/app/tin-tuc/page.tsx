import { Reveal } from "@/components/motion/reveal";

export const metadata = { title: "Tin tức — & GreenLife" };

const POSTS = [
  { emo: "🍓", date: "28 · 06 · 2026", t: "Ra mắt Kombucha Dâu Tây Lavender", d: "Phiên bản giới hạn mùa hè — kombucha lên men tự nhiên kết hợp dâu tây Đà Lạt và hoa lavender, thanh mát và giàu probiotic." },
  { emo: "🎁", date: "20 · 06 · 2026", t: "Tích điểm đổi quà — thành viên GreenLife", d: "Mỗi 10.000đ chi tiêu được 1 điểm; 100 điểm đổi 10.000đ. Đăng nhập trước khi đặt để tích điểm và đổi ưu đãi." },
  { emo: "🌿", date: "12 · 06 · 2026", t: "Cam kết không chất bảo quản", d: "Toàn bộ thức uống dùng nguyên liệu tươi, hạn dùng ngắn, không phẩm màu và chất bảo quản nhân tạo." },
  { emo: "🚚", date: "05 · 06 · 2026", t: "Sắp có giao hàng tận nơi", d: "GreenLife đang thử nghiệm đặt món online và giao hàng khu vực Hà Nội. Theo dõi để nhận thông báo sớm nhất." },
];

export default function NewsPage() {
  return (
    <>
      <div className="px-6 pb-5 pt-16 text-center">
        <p className="kicker">Cập nhật</p>
        <h1 className="mt-2 font-display text-4xl font-semibold md:text-5xl">Tin tức &amp; Khuyến mãi</h1>
      </div>

      <div className="mx-auto max-w-3xl px-6 pb-24">
        {POSTS.map((p, i) => (
          <Reveal key={p.t} delay={i * 0.08}>
            <article className="flex items-start gap-6 border-b border-border py-8">
              <div className="flex h-28 w-28 flex-none items-center justify-center rounded-2xl bg-[radial-gradient(circle_at_35%_30%,#fff,#ece6da)] text-5xl">
                {p.emo}
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-primary">{p.date}</div>
                <h3 className="mt-1 font-display text-2xl font-semibold leading-tight">{p.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.d}</p>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </>
  );
}
