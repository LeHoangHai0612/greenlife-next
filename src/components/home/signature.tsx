import { Reveal } from "@/components/motion/reveal";

const FALLBACK =
  "https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=1100&q=80";

// Dấu "〜" mảnh trước tiêu đề (kiểu &TEA)
function Swoosh() {
  return (
    <svg width="34" height="12" viewBox="0 0 34 12" fill="none" aria-hidden className="text-primary">
      <path d="M2 7 C 7 0, 12 0, 17 6 S 27 12, 32 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Signature({
  image,
  list = ["Detox thanh lọc", "Kombucha lên men", "Sữa hạt dưỡng chất", "Trà thảo mộc"],
}: {
  image?: string;
  list?: string[];
}) {
  return (
    <section className="grid items-stretch md:grid-cols-2">
      {/* ảnh */}
      <div
        className="min-h-[58vh] bg-cover bg-center"
        style={{ backgroundImage: `url('${image || FALLBACK}')` }}
      />

      {/* nội dung */}
      <div className="relative flex flex-col justify-center gap-5 px-8 py-16 md:px-16">
        <Reveal>
          <div className="mb-2 flex items-center gap-3">
            <Swoosh />
            <h3 className="font-display text-3xl font-semibold">Cốt lõi dinh dưỡng</h3>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            Mỗi ly chắt lọc tinh tuý rau củ – trái cây hữu cơ rõ nguồn gốc, cân bằng vi chất và giữ trọn
            enzyme sống. Định lượng chuẩn theo công thức, không chất bảo quản.
          </p>
          <div className="mt-4 text-[12px] uppercase tracking-[0.2em] text-primary">
            Thử ngay · Detox xanh, Kombucha gừng chanh
          </div>
        </Reveal>

        {/* danh sách biến thể dọc, có vạch kẻ bên phải */}
        <div className="mt-6 flex justify-end">
          <div className="flex items-stretch gap-4">
            <div className="flex flex-col items-end gap-2 text-right font-display text-xl">
              {list.map((l, i) => (
                <span key={l} className={i === 0 ? "text-foreground" : "text-primary/70"}>
                  {l}
                </span>
              ))}
            </div>
            <div className="relative w-px bg-border">
              <span className="absolute right-0 top-1 h-px w-5 -translate-y-1/2 bg-primary" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
