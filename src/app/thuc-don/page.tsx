import { getCategories, getProducts } from "@/lib/data";
import { MenuView } from "@/components/menu/menu-view";

export const metadata = { title: "Thực đơn — & GreenLife" };

export default async function MenuPage() {
  const [categories, products] = await Promise.all([getCategories(), getProducts()]);

  return (
    <>
      <div className="px-6 pb-5 pt-16 text-center">
        <p className="kicker">Tea in life</p>
        <h1 className="mt-2 font-display text-4xl font-semibold md:text-5xl">Thực đơn</h1>
      </div>
      <MenuView categories={categories} products={products} />
    </>
  );
}
