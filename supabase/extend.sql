-- ============================================================
-- GreenLife Drink — MỞ RỘNG schema theo Báo cáo BTL (FR-01..FR-12)
-- Chạy SAU schema.sql. An toàn chạy lại (drop/create-or-replace).
-- Bổ sung: CRM khách hàng, nhà cung cấp, phiếu đặt NL, lệnh sản xuất,
--          khuyến mãi; RPC đổi điểm + POS + nhập kho; seed dữ liệu demo.
-- ============================================================

-- ---------- CRM khách hàng (phone-based, dùng cho POS tại quầy) ----------
create table if not exists customers (
  id          uuid primary key default gen_random_uuid(),
  code        text unique,
  phone       text unique not null,
  name        text not null,
  rank        text not null default 'Mới',
  points      int  not null default 0,
  total_spend numeric not null default 0,
  last_order  date,
  created_at  timestamptz not null default now()
);

-- ---------- Nhà cung cấp ----------
create table if not exists suppliers (
  id               uuid primary key default gen_random_uuid(),
  code             text unique,
  name             text not null,
  ingredient_group text,
  contact          text,
  rating           text,
  created_at       timestamptz not null default now()
);

-- ---------- Cột bổ sung cho orders (POS + đổi điểm + nhân viên) ----------
alter table orders add column if not exists crm_customer_id uuid references customers(id);
alter table orders add column if not exists discount       numeric not null default 0;
alter table orders add column if not exists served_by_name text;

-- ---------- Phiếu đặt nguyên liệu (FR-11) ----------
create table if not exists purchase_orders (
  id          uuid primary key default gen_random_uuid(),
  code        text unique,
  supplier_id uuid references suppliers(id),
  status      text not null default 'draft',   -- draft | sent | received
  note        text,
  created_at  timestamptz not null default now()
);
create table if not exists purchase_order_items (
  id            uuid primary key default gen_random_uuid(),
  po_id         uuid references purchase_orders(id) on delete cascade,
  ingredient_id text references ingredients(id),
  qty           numeric not null
);

-- ---------- Lệnh sản xuất + QC đầu ra (FR-08) ----------
create table if not exists production_orders (
  id          uuid primary key default gen_random_uuid(),
  code        text unique,
  product_id  uuid references products(id),
  qty         int not null,
  status      text not null default 'planned',  -- planned | producing | done
  qc_out      text not null default 'pending',  -- pending | passed | rejected
  qc_note     text,
  created_at  timestamptz not null default now()
);

-- ---------- Khuyến mãi / Voucher (FR-12) ----------
create table if not exists promotions (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,
  description text,
  kind        text not null default 'percent',  -- percent | amount
  value       numeric not null,                 -- % hoặc số tiền
  min_total   numeric not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- RPC: NHẬP KHO + QC ĐẦU VÀO theo lô (FR-05, FR-08)
-- ============================================================
create or replace function receive_stock(
  p_ingredient_id text,
  p_batch_code    text,
  p_qty           numeric,
  p_expiry        date default null,
  p_qc_status     text default 'passed',
  p_qc_note       text default null
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_batch uuid;
begin
  if not is_staff() then raise exception 'Không có quyền' using errcode = 'P0001'; end if;
  if p_qty is null or p_qty <= 0 then raise exception 'Số lượng không hợp lệ' using errcode='P0001'; end if;

  insert into ingredient_batches (ingredient_id, batch_code, qty_received, qty_remaining, expiry_date, qc_status, qc_note)
  values (p_ingredient_id, p_batch_code, p_qty, p_qty, p_expiry, p_qc_status, p_qc_note)
  returning id into v_batch;

  -- Chỉ cộng tồn khi QC đạt
  if p_qc_status = 'passed' then
    update ingredients set stock = stock + p_qty where id = p_ingredient_id;
    insert into inventory_tx (ingredient_id, batch_id, change, reason)
    values (p_ingredient_id, v_batch, p_qty, 'Nhập kho lô ' || p_batch_code);
  end if;

  return jsonb_build_object('ok', true, 'batch_id', v_batch);
end;
$$;

-- ============================================================
-- RPC: ĐẶT HÀNG (thay bản cũ) — hỗ trợ đổi điểm + POS theo CRM
-- p_crm_customer_id: khách CRM (POS tại quầy); nếu null & online thì dùng auth.uid()
-- p_redeem: số điểm đổi (bội số 100; 100 điểm = 10.000đ)
-- ============================================================
drop function if exists place_order(jsonb, text, text, text);
create or replace function place_order(
  p_items   jsonb,
  p_payment text default 'Tiền mặt',
  p_source  text default 'Khách đặt',
  p_address text default null,
  p_crm_customer_id uuid default null,
  p_redeem  int default 0,
  p_served_by text default null
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid        uuid := auth.uid();
  v_loyalty    text := 'none';        -- 'profile' | 'customer' | 'none'
  v_target     uuid;
  v_avail_pts  int := 0;
  v_redeem     int := 0;
  v_discount   numeric := 0;
  v_total      numeric := 0;
  v_net        numeric := 0;
  v_code       text;
  v_order_id   uuid;
  v_cust_name  text := 'Khách vãng lai';
  v_earned     int := 0;
  v_n_items    int; v_n_matched int;
  v_ing record; v_new_stock numeric; v_min_stock numeric; v_ing_name text;
  v_low jsonb := '[]'::jsonb;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Đơn hàng trống' using errcode='P0001'; end if;
  if exists (select 1 from jsonb_to_recordset(p_items) as x(product_id uuid, qty int) where x.qty is null or x.qty <= 0) then
    raise exception 'Số lượng phải là số nguyên dương' using errcode='P0001'; end if;

  select count(*), count(p.id) into v_n_items, v_n_matched
  from jsonb_to_recordset(p_items) as x(product_id uuid, qty int)
  left join products p on p.id = x.product_id and p.is_active;
  if v_n_matched < v_n_items then raise exception 'Đơn chứa sản phẩm không hợp lệ' using errcode='P0001'; end if;

  select coalesce(sum(x.qty * p.price),0) into v_total
  from jsonb_to_recordset(p_items) as x(product_id uuid, qty int)
  join products p on p.id = x.product_id;

  -- Xác định đối tượng tích điểm
  if p_crm_customer_id is not null then
    v_loyalty := 'customer'; v_target := p_crm_customer_id;
    select name, points into v_cust_name, v_avail_pts from customers where id = v_target;
    if v_cust_name is null then raise exception 'Khách CRM không tồn tại' using errcode='P0001'; end if;
  elsif p_source <> 'Tại quầy' and v_uid is not null then
    v_loyalty := 'profile'; v_target := v_uid;
    select coalesce(full_name,'Khách'), points into v_cust_name, v_avail_pts from profiles where id = v_uid;
  elsif p_source = 'Tại quầy' then
    v_cust_name := 'Khách vãng lai';
  else
    v_cust_name := 'Khách online';
  end if;

  -- Đổi điểm: bội số 100, không vượt điểm hiện có, không vượt tổng tiền
  if p_redeem > 0 and v_loyalty <> 'none' then
    v_redeem := least((p_redeem / 100) * 100, (v_avail_pts / 100) * 100);
    v_discount := least((v_redeem / 100) * 10000, v_total);
    v_redeem := (v_discount / 10000)::int * 100;  -- đồng bộ điểm thực dùng
  end if;
  v_net := v_total - v_discount;

  -- Khóa + kiểm tra tồn kho
  perform 1 from ingredients i where i.id in (
    select distinct r.ingredient_id from jsonb_to_recordset(p_items) as x(product_id uuid, qty int)
    join recipes r on r.product_id = x.product_id) for update;
  for v_ing in
    select r.ingredient_id as id, sum(r.qty * x.qty) as need
    from jsonb_to_recordset(p_items) as x(product_id uuid, qty int)
    join recipes r on r.product_id = x.product_id group by r.ingredient_id
  loop
    select stock, name into v_new_stock, v_ing_name from ingredients where id = v_ing.id;
    if v_new_stock < v_ing.need then raise exception 'Không đủ nguyên liệu: %', v_ing_name using errcode='P0001'; end if;
  end loop;

  v_code := 'DH' || lpad(nextval('order_code_seq')::text, 4, '0');

  insert into orders (code, user_id, crm_customer_id, customer_name, source, status, total_amount, discount, payment, shipping_address, served_by_name)
  values (v_code, case when v_loyalty='profile' then v_target else null end,
          case when v_loyalty='customer' then v_target else null end,
          v_cust_name, p_source, 'paid', v_net, v_discount, p_payment, p_address, p_served_by)
  returning id into v_order_id;

  insert into order_items (order_id, product_id, quantity, price)
  select v_order_id, x.product_id, x.qty, p.price
  from jsonb_to_recordset(p_items) as x(product_id uuid, qty int)
  join products p on p.id = x.product_id;

  -- Trừ kho + nhật ký + cảnh báo ngưỡng
  for v_ing in
    select r.ingredient_id as id, sum(r.qty * x.qty) as need
    from jsonb_to_recordset(p_items) as x(product_id uuid, qty int)
    join recipes r on r.product_id = x.product_id group by r.ingredient_id
  loop
    update ingredients set stock = stock - v_ing.need where id = v_ing.id
      returning stock, min_stock, name into v_new_stock, v_min_stock, v_ing_name;
    insert into inventory_tx (ingredient_id, change, reason) values (v_ing.id, -v_ing.need, 'Bán hàng ' || v_code);
    if v_new_stock < v_min_stock then
      v_low := v_low || jsonb_build_object('id', v_ing.id, 'name', v_ing_name, 'stock', v_new_stock, 'min_stock', v_min_stock);
    end if;
  end loop;

  -- Tích điểm trên số tiền thực trả + trừ điểm đã đổi + nâng hạng
  v_earned := floor(v_net / 10000);
  if v_loyalty = 'customer' then
    update customers set points = points - v_redeem + v_earned, total_spend = total_spend + v_net, last_order = current_date,
      rank = case when (total_spend + v_net) >= 2000000 then 'VIP' when (total_spend + v_net) >= 1000000 then 'Thân thiết' else 'Mới' end
      where id = v_target;
  elsif v_loyalty = 'profile' then
    update profiles set points = points - v_redeem + v_earned, total_spend = total_spend + v_net,
      rank = case when (total_spend + v_net) >= 2000000 then 'VIP' when (total_spend + v_net) >= 1000000 then 'Thân thiết' else 'Mới' end
      where id = v_target;
  end if;

  return jsonb_build_object('ok', true, 'code', v_code, 'total', v_net, 'discount', v_discount,
    'redeemed', v_redeem, 'earned', v_earned, 'logged_in', v_loyalty <> 'none', 'low_stock', v_low);
end;
$$;

-- ============================================================
-- RLS cho bảng mới
-- ============================================================
alter table customers          enable row level security;
alter table suppliers          enable row level security;
alter table purchase_orders    enable row level security;
alter table purchase_order_items enable row level security;
alter table production_orders   enable row level security;
alter table promotions          enable row level security;

drop policy if exists customers_staff on customers;
create policy customers_staff on customers for all using (is_staff()) with check (is_staff());
drop policy if exists suppliers_staff on suppliers;
create policy suppliers_staff on suppliers for all using (is_staff()) with check (is_staff());
drop policy if exists po_staff on purchase_orders;
create policy po_staff on purchase_orders for all using (is_staff()) with check (is_staff());
drop policy if exists poi_staff on purchase_order_items;
create policy poi_staff on purchase_order_items for all using (is_staff()) with check (is_staff());
drop policy if exists prod_staff on production_orders;
create policy prod_staff on production_orders for all using (is_staff()) with check (is_staff());
drop policy if exists promo_read on promotions;
create policy promo_read on promotions for select using (true);
drop policy if exists promo_write on promotions;
create policy promo_write on promotions for all using (is_staff()) with check (is_staff());

-- ============================================================
-- SEED DỮ LIỆU DEMO theo báo cáo
-- ============================================================
-- 7 nhà cung cấp (mục F)
insert into suppliers (code, name, ingredient_group, contact, rating) values
('NCC01','CTY TNHH Organic Green','Gừng, cần tây hữu cơ','0243 7654 321','Tốt'),
('NCC02','Trang trại DaLat Farm','Dâu tây, rau củ Đà Lạt','0263 3822 100','Tốt'),
('NCC03','GreenKombu VN','Men SCOBY kombucha','0904 112 233','Khá'),
('NCC04','Nuts & Seeds Co.','Hạt óc chó, hạnh nhân','0287 3001 456','Tốt'),
('NCC05','Rau hữu cơ Việt','Cà rốt, cải bó xôi','0243 6688 999','Tốt'),
('NCC06','Mật Ong Tây Nguyên','Mật ong rừng','0905 778 899','Tốt'),
('NCC07','Chè Tân Cương Thái Nguyên','Trà xanh, trà đen','0208 3855 246','Khá')
on conflict (code) do nothing;

-- 10 khách hàng CRM (mục B)
insert into customers (code, phone, name, rank, total_spend, points, last_order) values
('KH001','0912345678','Nguyễn Thị Lan','VIP',2850000,285,'2026-06-25'),
('KH002','0987654321','Trần Văn Minh','Thân thiết',1450000,145,'2026-06-23'),
('KH003','0908765432','Lê Thị Hoa','Thân thiết',1680000,168,'2026-06-21'),
('KH004','0976543210','Phạm Văn Nam','Mới',320000,32,'2026-06-13'),
('KH005','0965432109','Hoàng Thị Mai','Thân thiết',2100000,210,'2026-06-17'),
('KH006','0954321098','Vũ Văn Đức','VIP',3950000,395,'2026-06-15'),
('KH007','0943210987','Đặng Thị Thu','Thân thiết',1920000,192,'2026-06-11'),
('KH008','0932109876','Bùi Văn Hùng','Mới',480000,48,'2026-06-16'),
('KH009','0921098765','Ngô Thị Linh','Thân thiết',1350000,135,'2026-06-14'),
('KH010','0910987654','Đinh Văn Long','VIP',4200000,420,'2026-06-25')
on conflict (phone) do nothing;

-- Khuyến mãi mẫu
insert into promotions (code, description, kind, value, min_total) values
('WELCOME10','Giảm 10% đơn đầu','percent',10,0),
('GIAM20K','Giảm 20.000đ cho đơn từ 100k','amount',20000,100000)
on conflict (code) do nothing;

-- 20 đơn hàng mẫu (mục C) — seed lịch sử, gắn khách CRM theo SĐT
with o(code, ts, phone, total, payment, nv) as (values
  ('DH0001','2026-06-05 09:12','0908765432',115000,'Tiền mặt','NV02'),
  ('DH0002','2026-06-05 10:45','0912345678',106000,'QR VNPay','NV01'),
  ('DH0003','2026-06-06 08:30',null,142000,'Tiền mặt','NV03'),
  ('DH0004','2026-06-06 11:20','0954321098',138000,'Momo','NV02'),
  ('DH0005','2026-06-07 14:15','0987654321',104000,'Tiền mặt','NV01'),
  ('DH0006','2026-06-08 09:00','0965432109',137000,'QR ZaloPay','NV02'),
  ('DH0007','2026-06-09 16:45','0910987654',164000,'Momo','NV03'),
  ('DH0008','2026-06-10 08:20',null,88000,'Tiền mặt','NV01'),
  ('DH0009','2026-06-11 11:00','0943210987',135000,'QR VNPay','NV02'),
  ('DH0010','2026-06-12 15:30','0912345678',158000,'Thẻ ngân hàng','NV01'),
  ('DH0011','2026-06-13 09:45','0976543210',119000,'Tiền mặt','NV03'),
  ('DH0012','2026-06-14 10:10','0921098765',112000,'Momo','NV02'),
  ('DH0013','2026-06-15 13:00','0954321098',138000,'QR VNPay','NV01'),
  ('DH0014','2026-06-16 08:50','0932109876',102000,'Tiền mặt','NV03'),
  ('DH0015','2026-06-17 11:30','0965432109',150000,'Momo','NV02'),
  ('DH0016','2026-06-18 15:00','0910987654',169000,'QR ZaloPay','NV01'),
  ('DH0017','2026-06-20 09:30',null,122000,'Tiền mặt','NV03'),
  ('DH0018','2026-06-21 14:20','0908765432',191000,'QR VNPay','NV02'),
  ('DH0019','2026-06-23 10:00','0987654321',158000,'Momo','NV01'),
  ('DH0020','2026-06-25 08:45','0912345678',132000,'Thẻ ngân hàng','NV02')
)
insert into orders (code, created_at, crm_customer_id, customer_name, source, status, total_amount, payment, served_by_name)
select o.code, o.ts::timestamptz, c.id, coalesce(c.name,'Khách vãng lai'), 'Tại quầy', 'paid', o.total, o.payment, o.nv
from o left join customers c on c.phone = o.phone
on conflict (code) do nothing;

-- Chi tiết các đơn (mục C) — gắn theo tên sản phẩm
with it(code, pname, qty) as (values
  ('DH0001','Kombucha Gừng Chanh',1),('DH0001','Trà Gạo Lứt Đường Phèn',2),
  ('DH0002','Sữa Hạt Óc Chó Mật Ong',1),('DH0002','Dừa Tươi Nha Đam',1),
  ('DH0003','Detox Dưa Hấu Bạc Hà',2),('DH0003','Chanh Muối Đường Thốt Nốt',1),
  ('DH0004','Sinh Tố Bơ Mật Ong Cacao',1),('DH0004','Trà Xanh Mật Ong Chanh Đào',2),
  ('DH0005','Kombucha Dâu Tây Lavender',1),('DH0005','Cải Bó Xôi Táo Lựu',1),
  ('DH0006','Dứa Gừng Nghệ',1),('DH0006','Trà Gạo Lứt Đường Phèn',1),('DH0006','Sữa Hạnh Nhân Dâu Tây Chia',1),
  ('DH0007','Sữa Hạt Óc Chó Mật Ong',2),('DH0007','Kombucha Ổi Hibiscus',1),
  ('DH0008','Cần Tây Táo Gừng',1),('DH0008','Trà Xanh Mật Ong Chanh Đào',1),
  ('DH0009','Kombucha Gừng Chanh',2),('DH0009','Cà Rốt Cam Nghệ',1),
  ('DH0010','Sinh Tố Bơ Mật Ong Cacao',1),('DH0010','Dừa Tươi Nha Đam',2),
  ('DH0011','Chanh Muối Đường Thốt Nốt',2),('DH0011','Detox Dưa Hấu Bạc Hà',1),
  ('DH0012','Kombucha Dâu Tây Lavender',1),('DH0012','Sữa Hạnh Nhân Dâu Tây Chia',1),
  ('DH0013','Sữa Hạt Óc Chó Mật Ong',1),('DH0013','Dứa Gừng Nghệ',1),('DH0013','Trà Xanh Mật Ong Chanh Đào',1),
  ('DH0014','Trà Gạo Lứt Đường Phèn',2),('DH0014','Chanh Muối Đường Thốt Nốt',1),
  ('DH0015','Cải Bó Xôi Táo Lựu',1),('DH0015','Kombucha Ổi Hibiscus',1),('DH0015','Cần Tây Táo Gừng',1),
  ('DH0016','Sinh Tố Bơ Mật Ong Cacao',2),('DH0016','Kombucha Gừng Chanh',1),
  ('DH0017','Cà Rốt Cam Nghệ',2),('DH0017','Chanh Muối Đường Thốt Nốt',1),
  ('DH0018','Sữa Hạnh Nhân Dâu Tây Chia',1),('DH0018','Trà Xanh Mật Ong Chanh Đào',2),('DH0018','Detox Dưa Hấu Bạc Hà',1),
  ('DH0019','Sữa Hạt Óc Chó Mật Ong',1),('DH0019','Kombucha Dâu Tây Lavender',1),('DH0019','Dừa Tươi Nha Đam',1),
  ('DH0020','Kombucha Gừng Chanh',1),('DH0020','Cải Bó Xôi Táo Lựu',1),('DH0020','Trà Gạo Lứt Đường Phèn',1)
)
insert into order_items (order_id, product_id, quantity, price)
select ord.id, p.id, it.qty, p.price
from it
join orders ord on ord.code = it.code
join products p on p.name = it.pname
where not exists (select 1 from order_items oi where oi.order_id = ord.id and oi.product_id = p.id);

-- Đẩy sequence mã đơn vượt qua các mã seed (DH0001..DH0020) để tránh trùng khoá
select setval('order_code_seq',
  (select coalesce(max((substring(code from '\d+'))::int), 0) from orders));

-- Nhật ký nhập-xuất kho (mục G)
insert into inventory_tx (ingredient_id, change, reason, created_at) values
('NL001', 1500, 'Nhập PN-20260601-01 (NCC01)','2026-06-01'),
('NL002',  800, 'Nhập PN-20260601-02 (NCC02)','2026-06-01'),
('NL001',  -75, 'Xuất LSX-20260605 (5 ly Kombucha)','2026-06-05'),
('NL004',  -50, 'Xuất LSX-20260609 (2 ly Sữa hạt)','2026-06-09'),
('NL010',  500, 'Nhập PN-20260612-01 (NCC07)','2026-06-12'),
('NL002', 1000, 'Nhập PN-20260625-01 (NCC02, đã QC đạt)','2026-06-25');
