import { Hero } from "@/components/home/hero";
import { Marquee } from "@/components/home/marquee";
import { Stats } from "@/components/home/stats";
import { OrnamentHeading } from "@/components/home/ornament-heading";
import { Signature } from "@/components/home/signature";
import { OutlineMarquee } from "@/components/home/outline-marquee";
import { DrinksShowcase } from "@/components/home/drinks-showcase";
import { Story } from "@/components/home/story";
import { getCategories, getProducts, getSiteImages } from "@/lib/data";

export default async function HomePage() {
  const [categories, products, images] = await Promise.all([
    getCategories(),
    getProducts(),
    getSiteImages(),
  ]);

  return (
    <>
      <Hero leftImg={images.hero_left} rightImg={images.hero_right} />
      <Marquee />
      <Stats />

      {/* Khối đặc trưng kiểu editorial (tham khảo phong cách &TEA, nội dung & ảnh của GreenLife) */}
      <OrnamentHeading title="Tinh tuý từ thiên nhiên" subtitle="Green & Nature">
        Dòng thức uống dinh dưỡng chắt lọc từ nguyên liệu hữu cơ, qua quy trình kiểm soát chất lượng theo lô —
        cân bằng hương vị và dưỡng chất trong từng giọt.
      </OrnamentHeading>
      <Signature image={images.story_1} />
      <OutlineMarquee text="GREENLIFE · TƯƠI MỖI NGÀY ·" />

      <Story img1={images.story_1} img2={images.story_2} />
      <DrinksShowcase categories={categories} products={products} />
    </>
  );
}
