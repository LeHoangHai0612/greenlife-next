-- ============================================================
-- GreenLife Drink — Schema Supabase (PostgreSQL) cho app Next.js
-- Xác thực: Supabase Auth (auth.users) + bảng public.profiles
-- Chạy: Supabase Dashboard -> SQL Editor -> New query -> dán file này -> Run
-- ============================================================

create extension if not exists "pgcrypto";

-- Dọn dẹp (chạy lại được). Lưu ý: KHÔNG xoá auth.users.
drop table if exists order_items     cascade;
drop table if exists orders          cascade;
drop table if exists inventory_tx    cascade;
drop table if exists ingredient_batches cascade;
drop table if exists recipes         cascade;
drop table if exists products        cascade;
drop table if exists categories      cascade;
drop table if exists ingredients     cascade;
drop table if exists profiles        cascade;
drop function if exists place_order(jsonb, text, text, text) cascade;
drop function if exists is_staff() cascade;
drop function if exists handle_new_user() cascade;

-- ============================================================
-- 1) PROFILES — hồ sơ người dùng, 1-1 với auth.users
--    role: 'customer' | 'staff' | 'manager' | 'admin'
-- ============================================================
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text,
  phone        text,
  role         text not null default 'customer',
  rank         text not null default 'Mới',
  points       int  not null default 0,
  total_spend  numeric not null default 0,
  created_at   timestamptz not null default now()
);

-- Tự tạo profile khi có user mới đăng ký (đọc full_name/phone từ metadata)
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id,
          new.raw_user_meta_data->>'full_name',
          new.raw_user_meta_data->>'phone');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Helper: người gọi hiện tại có phải nhân viên không (dùng trong RLS)
create or replace function is_staff()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('staff','manager','admin')
  );
$$;

-- ============================================================
-- 2) DANH MỤC & SẢN PHẨM
-- ============================================================
create table categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text unique not null,
  sort_order int  not null default 0
);

create table products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  price       numeric not null,
  cost        numeric not null default 0,
  calo        int     not null default 0,
  hsd         text,                       -- hạn sử dụng (vd '72h')
  image_url   text,
  category_id uuid references categories(id) on delete set null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
create index on products(category_id);

-- ============================================================
-- 3) KHO NGUYÊN LIỆU + CÔNG THỨC (BOM) + LÔ/HSD/QC + NHẬT KÝ
-- ============================================================
create table ingredients (
  id        text primary key,             -- mã NL: 'NL001'
  name      text not null,
  unit      text not null,
  stock     numeric not null default 0,
  min_stock numeric not null default 0
);

-- BOM: mỗi sản phẩm gồm các nguyên liệu + định lượng
create table recipes (
  product_id    uuid references products(id) on delete cascade,
  ingredient_id text references ingredients(id) on delete cascade,
  qty           numeric not null,
  primary key (product_id, ingredient_id)
);

-- Lô nhập + HSD + QC đầu vào (truy xuất nguồn gốc VSATTP)
create table ingredient_batches (
  id            uuid primary key default gen_random_uuid(),
  ingredient_id text references ingredients(id) on delete cascade,
  batch_code    text not null,
  qty_received  numeric not null,
  qty_remaining numeric not null,
  received_at   date not null default current_date,
  expiry_date   date,
  qc_status     text not null default 'pending',  -- pending | passed | rejected
  qc_note       text,
  created_at    timestamptz not null default now()
);
create index on ingredient_batches(ingredient_id);

-- Nhật ký nhập/xuất kho
create table inventory_tx (
  id            uuid primary key default gen_random_uuid(),
  ingredient_id text references ingredients(id),
  batch_id      uuid references ingredient_batches(id),
  change        numeric not null,          -- + nhập, - xuất
  reason        text,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- 4) ĐƠN HÀNG
-- ============================================================
create sequence if not exists order_code_seq;

create table orders (
  id               uuid primary key default gen_random_uuid(),
  code             text unique not null,
  user_id          uuid references profiles(id),     -- null = khách vãng lai
  customer_name    text,
  source           text not null default 'Tại quầy', -- 'Tại quầy' | 'Khách đặt'
  status           text not null default 'paid',     -- pending | paid | cancelled
  total_amount     numeric not null,
  payment          text not null,
  shipping_address text,
  created_at       timestamptz not null default now()
);
create index on orders(user_id);
create index on orders(created_at);

create table order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid references orders(id) on delete cascade,
  product_id uuid references products(id),
  quantity   int not null,
  price      numeric not null
);
create index on order_items(order_id);

-- ============================================================
-- 5) RPC ĐẶT HÀNG NGUYÊN TỬ (SECURITY DEFINER — bỏ qua RLS an toàn)
--    p_items: jsonb [{ "product_id": "<uuid>", "qty": 2 }]
--    source 'Tại quầy' => không tích điểm; ngược lại tích cho auth.uid()
-- ============================================================
create or replace function place_order(
  p_items   jsonb,
  p_payment text default 'Tiền mặt',
  p_source  text default 'Khách đặt',
  p_address text default null
) returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid        uuid := auth.uid();
  v_customer   uuid;
  v_total      numeric := 0;
  v_code       text;
  v_order_id   uuid;
  v_cust_name  text := 'Khách vãng lai';
  v_earned     int  := 0;
  v_n_items    int;
  v_n_matched  int;
  v_ing        record;
  v_new_stock  numeric;
  v_min_stock  numeric;
  v_ing_name   text;
  v_low        jsonb := '[]'::jsonb;
begin
  -- 0) Kiểm tra đầu vào
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Đơn hàng trống' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_items) as x(product_id uuid, qty int)
    where x.qty is null or x.qty <= 0
  ) then
    raise exception 'Số lượng sản phẩm phải là số nguyên dương' using errcode = 'P0001';
  end if;

  -- Mọi product_id phải tồn tại và đang bán
  select count(*), count(p.id)
    into v_n_items, v_n_matched
  from jsonb_to_recordset(p_items) as x(product_id uuid, qty int)
  left join products p on p.id = x.product_id and p.is_active;
  if v_n_matched < v_n_items then
    raise exception 'Đơn hàng chứa sản phẩm không hợp lệ' using errcode = 'P0001';
  end if;

  -- 1) Tổng tiền
  select coalesce(sum(x.qty * p.price), 0) into v_total
  from jsonb_to_recordset(p_items) as x(product_id uuid, qty int)
  join products p on p.id = x.product_id;

  -- 2) Khóa nguyên liệu liên quan (chống bán âm khi đồng thời)
  perform 1 from ingredients i
  where i.id in (
    select distinct r.ingredient_id
    from jsonb_to_recordset(p_items) as x(product_id uuid, qty int)
    join recipes r on r.product_id = x.product_id
  ) for update;

  -- 3) Kiểm tra đủ tồn
  for v_ing in
    select r.ingredient_id as id, sum(r.qty * x.qty) as need
    from jsonb_to_recordset(p_items) as x(product_id uuid, qty int)
    join recipes r on r.product_id = x.product_id
    group by r.ingredient_id
  loop
    select stock, name into v_new_stock, v_ing_name from ingredients where id = v_ing.id;
    if v_new_stock < v_ing.need then
      raise exception 'Không đủ nguyên liệu: %', v_ing_name using errcode = 'P0001';
    end if;
  end loop;

  -- 4) Khách hàng: chỉ tích điểm cho đơn online của user đã đăng nhập
  if p_source <> 'Tại quầy' and v_uid is not null then
    v_customer := v_uid;
    select full_name into v_cust_name from profiles where id = v_uid;
    v_cust_name := coalesce(v_cust_name, 'Khách');
  elsif p_source = 'Tại quầy' then
    v_cust_name := 'Khách vãng lai';
  else
    v_cust_name := 'Khách online';
  end if;

  -- 5) Mã đơn duy nhất
  v_code := 'DH' || lpad(nextval('order_code_seq')::text, 4, '0');

  -- 6) Ghi đơn + chi tiết
  insert into orders (code, user_id, customer_name, source, status, total_amount, payment, shipping_address)
  values (v_code, v_customer, v_cust_name, p_source, 'paid', v_total, p_payment, p_address)
  returning id into v_order_id;

  insert into order_items (order_id, product_id, quantity, price)
  select v_order_id, x.product_id, x.qty, p.price
  from jsonb_to_recordset(p_items) as x(product_id uuid, qty int)
  join products p on p.id = x.product_id;

  -- 7) Trừ kho + nhật ký + cảnh báo ngưỡng
  for v_ing in
    select r.ingredient_id as id, sum(r.qty * x.qty) as need
    from jsonb_to_recordset(p_items) as x(product_id uuid, qty int)
    join recipes r on r.product_id = x.product_id
    group by r.ingredient_id
  loop
    update ingredients set stock = stock - v_ing.need
      where id = v_ing.id
      returning stock, min_stock, name into v_new_stock, v_min_stock, v_ing_name;
    insert into inventory_tx (ingredient_id, change, reason)
      values (v_ing.id, -v_ing.need, 'Bán hàng ' || v_code);
    if v_new_stock < v_min_stock then
      v_low := v_low || jsonb_build_object('id', v_ing.id, 'name', v_ing_name,
                                           'stock', v_new_stock, 'min_stock', v_min_stock);
    end if;
  end loop;

  -- 8) Tích điểm + tự nâng hạng
  if v_customer is not null then
    v_earned := floor(v_total / 10000);
    update profiles
      set points = points + v_earned,
          total_spend = total_spend + v_total
      where id = v_customer;
    update profiles
      set rank = case
        when total_spend >= 2000000 then 'VIP'
        when total_spend >= 1000000 then 'Thân thiết'
        else 'Mới' end
      where id = v_customer;
  end if;

  return jsonb_build_object('ok', true, 'code', v_code, 'total', v_total,
                            'earned', v_earned, 'logged_in', v_customer is not null,
                            'low_stock', v_low);
end;
$$;

-- ============================================================
-- 6) ROW LEVEL SECURITY
-- ============================================================
alter table profiles           enable row level security;
alter table categories         enable row level security;
alter table products           enable row level security;
alter table ingredients        enable row level security;
alter table recipes            enable row level security;
alter table ingredient_batches enable row level security;
alter table inventory_tx       enable row level security;
alter table orders             enable row level security;
alter table order_items        enable row level security;

-- profiles: xem/sửa của mình; nhân viên xem tất cả
create policy profiles_self_select on profiles for select using (id = auth.uid() or is_staff());
create policy profiles_self_update on profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_staff_all   on profiles for all    using (is_staff()) with check (is_staff());

-- Danh mục & sản phẩm: ai cũng đọc (catalog công khai); chỉ nhân viên ghi
create policy categories_read on categories for select using (true);
create policy categories_write on categories for all using (is_staff()) with check (is_staff());
create policy products_read on products for select using (true);
create policy products_write on products for all using (is_staff()) with check (is_staff());
-- recipes đọc công khai để client kiểm tra tồn kho/BOM (tuỳ chọn)
create policy recipes_read on recipes for select using (true);
create policy recipes_write on recipes for all using (is_staff()) with check (is_staff());

-- Kho & nhật ký & lô: chỉ nhân viên
create policy ingredients_read  on ingredients for select using (true);
create policy ingredients_write on ingredients for all using (is_staff()) with check (is_staff());
create policy batches_staff on ingredient_batches for all using (is_staff()) with check (is_staff());
create policy invtx_staff   on inventory_tx for all using (is_staff()) with check (is_staff());

-- Đơn hàng: user xem đơn của mình, nhân viên xem tất cả.
-- KHÔNG mở insert trực tiếp — đặt hàng phải qua RPC place_order (security definer).
create policy orders_owner_select on orders for select using (user_id = auth.uid() or is_staff());
create policy order_items_select on order_items for select
  using (exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or is_staff())));

-- ============================================================
-- 7) SEED DỮ LIỆU MẪU
-- ============================================================
insert into categories (name, slug, sort_order) values
('Kombucha','kombucha',1),
('Detox','detox',2),
('Trà','tra',3),
('Sữa hạt','sua-hat',4),
('Sinh tố','sinh-to',5),
('Nước uống','nuoc-uong',6);

insert into ingredients (id,name,unit,stock,min_stock) values
('NL001','Gừng tươi','g',1500,300),
('NL002','Dâu tây Đà Lạt','g',800,200),
('NL003','SCOBY Kombucha','bộ',5,2),
('NL004','Hạt óc chó sấy','g',2000,400),
('NL005','Cần tây hữu cơ','g',1200,250),
('NL006','Cà rốt baby','g',2500,500),
('NL007','Mật ong rừng','ml',3000,500),
('NL008','Đường thốt nốt','g',2000,300),
('NL009','Cải bó xôi hữu cơ','g',1000,200),
('NL010','Trà xanh Thái Nguyên','g',500,100),
('NL011','Dưa hấu','g',3000,600),
('NL012','Bạc hà tươi','g',400,100);

-- Sản phẩm (gắn category theo slug)
insert into products (name,description,price,cost,calo,hsd,category_id)
select v.name, v.description, v.price, v.cost, v.calo, v.hsd, c.id
from (values
  ('Kombucha Gừng Chanh','Kombucha lên men với gừng và chanh',45000,25000,45,'72h','kombucha'),
  ('Detox Dưa Hấu Bạc Hà','Detox thanh mát dưa hấu & bạc hà',55000,20000,72,'24h','detox'),
  ('Trà Gạo Lứt Đường Phèn','Trà gạo lứt rang, đường phèn',35000,8000,115,'48h','tra'),
  ('Cần Tây Táo Gừng','Nước ép cần tây, táo, gừng',50000,22000,88,'24h','detox'),
  ('Kombucha Dâu Tây Lavender','Kombucha dâu tây & lavender',52000,28000,52,'72h','kombucha'),
  ('Cà Rốt Cam Nghệ','Nước ép cà rốt, cam, nghệ',45000,18000,105,'24h','detox'),
  ('Sữa Hạt Óc Chó Mật Ong','Sữa hạt óc chó, mật ong rừng',58000,32000,195,'48h','sua-hat'),
  ('Dứa Gừng Nghệ','Nước ép dứa, gừng, nghệ',42000,16000,98,'24h','detox'),
  ('Trà Xanh Mật Ong Chanh Đào','Trà xanh, mật ong, chanh đào',38000,10000,68,'48h','tra'),
  ('Cải Bó Xôi Táo Lựu','Nước ép cải bó xôi, táo, lựu',52000,23000,82,'24h','detox'),
  ('Kombucha Ổi Hibiscus','Kombucha ổi & hoa atiso đỏ',48000,27000,48,'72h','kombucha'),
  ('Sinh Tố Bơ Mật Ong Cacao','Sinh tố bơ, mật ong, cacao',62000,35000,285,'12h','sinh-to'),
  ('Chanh Muối Đường Thốt Nốt','Chanh muối, đường thốt nốt',32000,8000,78,'48h','nuoc-uong'),
  ('Dừa Tươi Nha Đam','Dừa tươi & nha đam',48000,20000,92,'24h','nuoc-uong'),
  ('Sữa Hạnh Nhân Dâu Tây Chia','Sữa hạnh nhân, dâu tây, hạt chia',60000,30000,168,'48h','sua-hat')
) as v(name,description,price,cost,calo,hsd,slug)
join categories c on c.slug = v.slug;

-- BOM (gắn theo tên sản phẩm)
insert into recipes (product_id, ingredient_id, qty)
select p.id, b.ingredient_id, b.qty
from (values
  ('Kombucha Gừng Chanh','NL001',15),('Kombucha Gừng Chanh','NL008',10),
  ('Detox Dưa Hấu Bạc Hà','NL011',200),('Detox Dưa Hấu Bạc Hà','NL012',10),
  ('Trà Gạo Lứt Đường Phèn','NL008',15),
  ('Cần Tây Táo Gừng','NL005',80),('Cần Tây Táo Gừng','NL001',5),
  ('Kombucha Dâu Tây Lavender','NL002',30),('Kombucha Dâu Tây Lavender','NL003',0.05),
  ('Cà Rốt Cam Nghệ','NL006',150),
  ('Sữa Hạt Óc Chó Mật Ong','NL004',25),('Sữa Hạt Óc Chó Mật Ong','NL007',10),
  ('Dứa Gừng Nghệ','NL001',8),
  ('Trà Xanh Mật Ong Chanh Đào','NL010',3),('Trà Xanh Mật Ong Chanh Đào','NL007',15),
  ('Cải Bó Xôi Táo Lựu','NL009',80),
  ('Kombucha Ổi Hibiscus','NL003',0.05),
  ('Sinh Tố Bơ Mật Ong Cacao','NL007',15),
  ('Chanh Muối Đường Thốt Nốt','NL008',20),
  ('Dừa Tươi Nha Đam','NL007',5),
  ('Sữa Hạnh Nhân Dâu Tây Chia','NL002',50),('Sữa Hạnh Nhân Dâu Tây Chia','NL007',8)
) as b(pname, ingredient_id, qty)
join products p on p.name = b.pname;

-- Lô nhập mẫu + QC passed cho vài nguyên liệu (minh hoạ truy xuất nguồn gốc)
insert into ingredient_batches (ingredient_id, batch_code, qty_received, qty_remaining, expiry_date, qc_status, qc_note) values
('NL001','GUNG-2026-06-01',1500,1500, current_date + 30, 'passed','Tươi, không dập'),
('NL002','DAU-2026-06-20', 800, 800, current_date + 7,  'passed','Đỏ đều, mùi thơm'),
('NL011','DUAHAU-2026-06-25',3000,3000, current_date + 10,'passed','Ngọt, không úng');

-- ============================================================
-- HƯỚNG DẪN TẠO TÀI KHOẢN QUẢN TRỊ:
-- 1) Đăng ký 1 user qua app (hoặc Supabase Auth > Add user).
-- 2) Lấy user id rồi chạy:
--      update profiles set role = 'admin' where id = '<uuid-cua-user>';
-- ============================================================
