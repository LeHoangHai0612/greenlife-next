# GreenLife Drink — Next.js + Supabase

Phiên bản web mới của GreenLife theo phong cách **andtea.com**, thay thế app Express/JS thuần cũ.

## Stack
- **Next.js 14** (App Router, Server Actions) + **TypeScript**
- **Supabase** (PostgreSQL + Auth + Storage)
- **Tailwind CSS** + **shadcn/ui** (component có sẵn trong `src/components/ui`)
- **Framer Motion** (hiệu ứng scroll/fade/hover)
- **Zustand** (state giỏ hàng — Phase D)
- Triển khai: **Vercel** (web) + **Supabase** (backend)

## Yêu cầu
- **Node.js 18.18+** (hiện máy chưa cài — cài tại https://nodejs.org)
- Một project **Supabase** (miễn phí)

## 1. Tạo database trên Supabase
1. Tạo project tại https://supabase.com (region Singapore cho nhanh).
2. **SQL Editor → New query** → dán `supabase/schema.sql` → **Run**
   (bảng cơ bản + RLS + RPC + seed 15 SP, 12 NL, BOM).
   Tạo query mới → dán `supabase/extend.sql` → **Run**
   (CRM khách hàng, nhà cung cấp, phiếu đặt NL, lệnh SX, khuyến mãi; RPC đổi điểm + POS + nhập kho;
   seed 10 khách, 7 NCC, 20 đơn mẫu, nhật ký kho — khớp báo cáo BTL).
   Tạo query mới → dán `supabase/extend2.sql` → **Run**
   (size S/M/L + combo, voucher áp tại checkout, RPC place_order v3, bucket Storage ảnh sản phẩm).
   Tạo query mới → dán `supabase/extend3.sql` → **Run**
   (bảng site_images cho admin đổi ảnh web + gán ảnh placeholder online cho 15 sản phẩm).
   > ⚠️ Chạy đủ 4 file theo thứ tự — bỏ `extend2.sql` thì đặt hàng/POS lỗi (sai chữ ký RPC).
3. **Project Settings → API** → copy `Project URL` và `anon public` key.

## 2. Cấu hình & chạy web
```bash
cd greenlife-next
copy .env.local.example .env.local   # Windows (macOS/Linux: cp)
# điền NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev
```
Mở http://localhost:3000

## 3. Tạo tài khoản quản trị
1. Đăng ký 1 tài khoản qua web (Phase E) **hoặc** Supabase → Authentication → Add user.
2. Lấy `user id`, vào SQL Editor chạy:
   ```sql
   update profiles set role = 'admin' where id = '<uuid-user>';
   ```
3. Truy cập `/admin` (middleware tự chặn nếu không phải nhân viên).

## Cấu trúc
```
greenlife-next/
├── supabase/schema.sql        # DB: bảng + RLS + RPC place_order + seed
├── src/
│   ├── app/                   # App Router (layout, trang chủ, ...)
│   ├── components/
│   │   ├── ui/                # shadcn/ui (Button, ...)
│   │   ├── site/              # Navbar, Footer
│   │   ├── home/              # Hero, Marquee, DrinksShowcase, Story
│   │   └── motion/            # Reveal (Framer Motion)
│   └── lib/
│       ├── supabase/          # client/server/middleware (@supabase/ssr)
│       ├── data.ts            # truy vấn catalog
│       ├── types.ts           # kiểu dữ liệu
│       └── utils.ts           # cn(), formatVnd()
└── middleware.ts              # refresh session + chặn /admin
```

## Bảo mật / nghiệp vụ
- **Đặt hàng** đi qua RPC `place_order` (SECURITY DEFINER, transaction nguyên tử): kiểm tra & trừ kho theo BOM với khóa `FOR UPDATE`, sinh mã đơn bằng sequence, tích điểm + tự nâng hạng, cảnh báo `min_stock`.
- **RLS**: catalog đọc công khai; kho/đơn/khách chỉ chủ sở hữu hoặc nhân viên; ghi catalog/kho chỉ nhân viên.
- **Lô/HSD/QC**: bảng `ingredient_batches` phục vụ truy xuất nguồn gốc VSATTP.

## Tạo tài khoản admin (cách nhanh nhất)
1. Supabase → **Authentication → Users → Add user** → nhập email + mật khẩu, **tích "Auto Confirm User"**.
   (Trigger tự tạo `profiles` cho user này.)
2. **SQL Editor** chạy: `update profiles set role = 'admin' where id = '<uuid-user>';`
3. Vào web `/dang-nhap` → đăng nhập → có nút "Vào trang quản trị" ở `/tai-khoan`, hoặc vào thẳng `/admin`.

> Nếu đăng ký qua web mà không nhận được session: do Supabase bật "Confirm email".
> Tắt tại **Authentication → Providers → Email → Confirm email = OFF** để đăng ký xong vào luôn.

## Nhập liệu từ file (Excel/CSV)
`/admin/nhap-lieu` — chọn loại (Nguyên liệu / Sản phẩm) → **Tải file mẫu** để biết đúng cột → upload `.xlsx/.xls/.csv` → xem trước → **Nhập**.
- Nguyên liệu (cột): `id, name, unit, stock, min_stock` (nhập trùng `id` sẽ cập nhật).
- Sản phẩm (cột): `name, description, price, cost, calo, hsd, category_slug`.

## Lộ trình
- [x] Phase A — Schema Supabase (DB + RLS + RPC + seed)
- [x] Phase B — Scaffold Next.js (config, Supabase client, middleware)
- [x] Phase C — Layout + trang chủ (Framer Motion)
- [x] Phase D — Thực đơn + giỏ hàng (Zustand) + checkout (RPC place_order)
- [x] Phase E — Auth Supabase + trang tài khoản (điểm/hạng/lịch sử đơn)
- [x] Phase F — Trang quản trị (RBAC): tổng quan, sản phẩm, kho+QC lô, đơn, báo cáo, **import file**
- Hiệu ứng động: chuyển trang mượt (`template.tsx`), reveal-on-scroll, hover, marquee, showcase animate.
