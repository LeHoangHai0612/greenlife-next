"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

const FALLBACK_LEFT =
  "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=1100&q=80";
const FALLBACK_RIGHT =
  "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?auto=format&fit=crop&w=1100&q=80";

export function Hero({ leftImg, rightImg }: { leftImg?: string; rightImg?: string }) {
  return (
    <section className="relative flex min-h-[88vh] overflow-hidden bg-[#E8E5DE]">
      {/* hai nửa ảnh kiểu andtea (có hiệu ứng zoom nhẹ) */}
      <motion.div
        initial={{ scale: 1.12 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1.6, ease: "easeOut" }}
        className="flex-1 bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(rgba(60,40,25,.12),rgba(60,40,25,.12)),url('${leftImg || FALLBACK_LEFT}')`,
        }}
      />
      <motion.div
        initial={{ scale: 1.12 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1.6, ease: "easeOut", delay: 0.1 }}
        className="hidden flex-1 bg-cover bg-center md:block"
        style={{ backgroundImage: `url('${rightImg || FALLBACK_RIGHT}')` }}
      />

      {/* logo giữa */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="pointer-events-none absolute left-1/2 top-[7vh] -translate-x-1/2 text-center mix-blend-difference"
      >
        <div className="font-display text-5xl font-bold leading-none text-white">&amp;</div>
        <div className="mt-1 text-[13px] tracking-[0.5em] text-white">GREENLIFE</div>
      </motion.div>

      {/* chữ dọc */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, delay: 0.3 }}
        className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:block"
      >
        <div className="font-display text-6xl font-semibold uppercase tracking-[0.15em] text-white/90">
          Sharing
        </div>
      </motion.div>

      {/* khối nội dung dưới */}
      <div className="absolute bottom-[8vh] left-1/2 w-full max-w-md -translate-x-1/2 px-6 text-center">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="kicker mb-3 text-white/90"
        >
          Tea in life
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
        >
          <Button asChild>
            <Link href="/thuc-don">Đặt món ngay</Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
