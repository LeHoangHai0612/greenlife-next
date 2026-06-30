"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Wrapper fade-in khi cuộn tới (Framer Motion) — dùng khắp site giống andtea.
export function Reveal({
  children,
  className,
  delay = 0,
  y = 36,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  return (
    <motion.div
      className={cn(className)}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.8, delay, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}
