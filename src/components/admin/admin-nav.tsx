"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Factory,
  ClipboardList,
  Users,
  Truck,
  ReceiptText,
  BarChart3,
  Upload,
  Ticket,
  IdCard,
  Image as ImageIcon,
  ScrollText,
} from "lucide-react";

const ITEMS = [
  { href: "/admin", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/admin/pos", label: "Bán hàng", icon: ShoppingCart },
  { href: "/admin/san-pham", label: "Sản phẩm", icon: Package },
  { href: "/admin/kho", label: "Kho", icon: Boxes },
  { href: "/admin/san-xuat", label: "Sản xuất", icon: Factory },
  { href: "/admin/dat-hang", label: "Đặt NL", icon: ClipboardList },
  { href: "/admin/khach-hang", label: "Khách hàng", icon: Users },
  { href: "/admin/nha-cung-cap", label: "Nhà cung cấp", icon: Truck },
  { href: "/admin/don-hang", label: "Đơn hàng", icon: ReceiptText },
  { href: "/admin/khuyen-mai", label: "Khuyến mãi", icon: Ticket },
  { href: "/admin/bao-cao", label: "Báo cáo", icon: BarChart3 },
  { href: "/admin/nhan-vien", label: "Nhân viên", icon: IdCard },
  { href: "/admin/nhat-ky", label: "Nhật ký", icon: ScrollText },
  { href: "/admin/hinh-anh", label: "Ảnh website", icon: ImageIcon },
  { href: "/admin/nhap-lieu", label: "Nhập liệu", icon: Upload },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col md:gap-0.5">
      {ITEMS.map((it) => {
        const active = path === it.href;
        const Icon = it.icon;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`flex flex-none items-center gap-3 rounded-xl px-4 py-3 text-[12px] uppercase tracking-[0.12em] transition-colors ${
              active
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
