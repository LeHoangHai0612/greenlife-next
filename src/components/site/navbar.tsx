"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const LINKS = [
  { href: "/", label: "Trang chủ" },
  { href: "/gioi-thieu", label: "Về GreenLife" },
  { href: "/thuc-don", label: "Thực đơn" },
  { href: "/tin-tuc", label: "Tin tức" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center border-b border-border bg-background/80 px-6 py-4 backdrop-blur-md">
        <button
          aria-label="Mở menu"
          onClick={() => setOpen(true)}
          className="w-10 text-foreground"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/" className="mx-auto text-center leading-none">
          <span className="font-display text-2xl font-bold">&amp;</span>
          <span className="block text-[9px] uppercase tracking-[0.4em] text-muted-foreground">
            GreenLife
          </span>
        </Link>
        <Link
          href="/tai-khoan"
          className="rounded-full border border-foreground px-4 py-2 text-[9px] uppercase tracking-[0.15em] transition-colors hover:bg-foreground hover:text-background"
        >
          Tài khoản
        </Link>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <button
              aria-label="Đóng menu"
              onClick={() => setOpen(false)}
              className="absolute right-6 top-5 text-foreground"
            >
              <X className="h-8 w-8" />
            </button>
            <nav className="flex flex-col items-center gap-3">
              {LINKS.map((l, i) => (
                <motion.div
                  key={l.href}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 * (i + 1) }}
                >
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="font-display text-4xl font-semibold transition-colors hover:text-primary"
                  >
                    {l.label}
                  </Link>
                </motion.div>
              ))}
            </nav>
            <div className="absolute bottom-8 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Facebook · Instagram · 0123 456 789
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
