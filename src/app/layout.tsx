import type { Metadata } from "next";
import { Playfair_Display, Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { ScrollProgress } from "@/components/motion/scroll-progress";

const playfair = Playfair_Display({
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});
const beVietnam = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "& GreenLife — Nước uống dinh dưỡng an toàn",
    template: "%s · & GreenLife",
  },
  description:
    "Thức uống dinh dưỡng từ nguyên liệu hữu cơ rõ nguồn gốc — kombucha, detox, trà, sữa hạt. Không chất bảo quản, định lượng chuẩn theo công thức.",
  keywords: ["GreenLife", "nước uống dinh dưỡng", "kombucha", "detox", "trà sữa hạt", "đồ uống healthy", "Hà Nội"],
  openGraph: {
    title: "& GreenLife — Nước uống dinh dưỡng an toàn",
    description: "Kombucha · Detox · Trà · Sữa hạt — nguyên liệu hữu cơ, không chất bảo quản.",
    type: "website",
    locale: "vi_VN",
    siteName: "& GreenLife",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={`${playfair.variable} ${beVietnam.variable}`}>
      <body>
        <ScrollProgress />
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
