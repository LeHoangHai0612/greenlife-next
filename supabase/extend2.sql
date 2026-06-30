-- ============================================================
-- GreenLife — MỞ RỘNG 2: size/combo, voucher tại checkout, ảnh Storage
-- Chạy SAU schema.sql + extend.sql. An toàn chạy lại.
-- ============================================================

-- ---------- Biến thể size (FR-02) ----------
create table if not exists product_variants (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  label      text not null,            -- 'S (nhỏ)' | 'M (vừa)' | 'L (lớn)'
  price      numeric not null,
  sort       int not null default 0
);
alter table order_items add column if not exists variant_id uuid references product_variants(id);
alter table orders      add column if not exists promo_code text;
alter table products    add column if not exists is_combo boolean not null default false;

alter table product_variants enable row level security;
drop policy if exists variants_read on product_variants;
create policy variants_read on product_variants for select using (true);
drop policy if exists variants_write on product_variants;
create policy variants_write on product_variants for all using (is_staff()) with check (is_staff());

-- Seed size cho toàn bộ sản phẩm (chỉ chạy nếu chưa có)
insert into product_variants (product_id, label, price, sort)
select id, 'S (nhỏ)', greatest(price - 6000, 0), 1 from products
where not exists (select 1 from product_variants v where v.product_id = products.id)
union all
select id, 'M (vừa)', price, 2 from products
where not exists (select 1 from product_variants v where v.product_id = products.id)
union all
select id, 'L (lớn)', price + 8000, 3 from products
where not exists (select 1 from product_variants v where v.product_id = products.id);

-- ---------- Combo (FR-02): sản phẩm gói, có công thức riêng ----------
insert into products (name, description, price, cost, calo, hsd, category_id, is_combo)
select v.name, v.description, v.price, v.cost, v.calo, v.hsd, c.id, true
from (values
  ('Combo Detox Đôi','2 chai detox tươi tiết kiệm', 95000, 40000, 160, '24h', 'detox'),
  ('Combo Sáng Năng Lượng','Sữa hạt + trà xanh cho buổi sáng', 90000, 42000, 263, '48h', 'sua-hat')
) as v(name,description,price,cost,calo,hsd,slug)
join categories c on c.slug = v.slug
where not exists (select 1 from products p where p.name = v.name);

-- BOM cho combo (gộp nguyên liệu)
insert into recipes (product_id, ingredient_id, qty)
select p.id, b.ingredient_id, b.qty
from (values
  ('Combo Detox Đôi','NL005',80),('Combo Detox Đôi','NL006',150),
  ('Combo Sáng Năng Lượng','NL004',25),('Combo Sáng Năng Lượng','NL010',3),('Combo Sáng Năng Lượng','NL007',25)
) as b(pname, ingredient_id, qty)
join products p on p.name = b.pname
where not exists (select 1 from recipes r where r.product_id = p.id);

-- ---------- Bucket ảnh sản phẩm (Supabase Storage) ----------
insert into storage.buckets (id, name, public) values ('product-images','product-images', true)
on conflict (id) do nothing;
drop policy if exists "product images public read" on storage.objects;
create policy "product images public read" on storage.objects for select using (bucket_id = 'product-images');
drop policy if exists "product images staff write" on storage.objects;
create policy "product images staff write" on storage.objects for insert
  with check (bucket_id = 'product-images' and is_staff());
drop policy if exists "product images staff update" on storage.objects;
create policy "product images staff update" on storage.objects for update
  using (bucket_id = 'product-images' and is_staff());

-- ============================================================
-- RPC place_order v3 — biến thể size + voucher + đổi điểm
-- items: [{ "product_id": uuid, "qty": int, "variant_id": uuid|null }]
-- ============================================================
drop function if exists place_order(jsonb, text, text, text, uuid, int, text);
create or replace function place_order(
  p_items   jsonb,
  p_payment text default 'Tiền mặt',
  p_source  text default 'Khách đặt',
  p_address text default null,
  p_crm_customer_id uuid default null,
  p_redeem  int default 0,
  p_served_by text default null,
  p_promo_code text default null
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_loyalty text := 'none'; v_target uuid; v_avail_pts int := 0;
  v_redeem int := 0; v_redeem_disc numeric := 0; v_promo_disc numeric := 0;
  v_total numeric := 0; v_net numeric := 0;
  v_code text; v_order_id uuid; v_cust_name text := 'Khách vãng lai'; v_earned int := 0;
  v_n_items int; v_n_matched int;
  v_promo promotions%rowtype;
  v_ing record; v_new_stock numeric; v_min_stock numeric; v_ing_name text;
  v_low jsonb := '[]'::jsonb;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Đơn hàng trống' using errcode='P0001'; end if;
  if exists (select 1 from jsonb_to_recordset(p_items) as x(product_id uuid, qty int, variant_id uuid) where x.qty is null or x.qty <= 0) then
    raise exception 'Số lượng phải là số nguyên dương' using errcode='P0001'; end if;

  select count(*), count(p.id) into v_n_items, v_n_matched
  from jsonb_to_recordset(p_items) as x(product_id uuid, qty int, variant_id uuid)
  left join products p on p.id = x.product_id and p.is_active;
  if v_n_matched < v_n_items then raise exception 'Đơn chứa sản phẩm không hợp lệ' using errcode='P0001'; end if;

  -- Tổng tiền: ưu tiên giá biến thể (nếu hợp lệ với sản phẩm), nếu không dùng giá gốc
  select coalesce(sum(x.qty * coalesce(v.price, p.price)),0) into v_total
  from jsonb_to_recordset(p_items) as x(product_id uuid, qty int, variant_id uuid)
  join products p on p.id = x.product_id
  left join product_variants v on v.id = x.variant_id and v.product_id = x.product_id;

  -- Đối tượng tích điểm
  if p_crm_customer_id is not null then
    v_loyalty := 'customer'; v_target := p_crm_customer_id;
    select name, points into v_cust_name, v_avail_pts from customers where id = v_target;
    if v_cust_name is null then raise exception 'Khách CRM không tồn tại' using errcode='P0001'; end if;
  elsif p_source <> 'Tại quầy' and v_uid is not null then
    v_loyalty := 'profile'; v_target := v_uid;
    select coalesce(full_name,'Khách'), points into v_cust_name, v_avail_pts from profiles where id = v_uid;
  elsif p_source = 'Tại quầy' then v_cust_name := 'Khách vãng lai';
  else v_cust_name := 'Khách online'; end if;

  -- Voucher
  if p_promo_code is not null and length(trim(p_promo_code)) > 0 then
    select * into v_promo from promotions where code = upper(trim(p_promo_code)) and active limit 1;
    if found and v_total >= v_promo.min_total then
      if v_promo.kind = 'percent' then v_promo_disc := floor(v_total * v_promo.value / 100);
      else v_promo_disc := v_promo.value; end if;
      v_promo_disc := least(v_promo_disc, v_total);
    end if;
  end if;

  -- Đổi điểm (sau khi đã trừ voucher để không vượt số phải trả)
  if p_redeem > 0 and v_loyalty <> 'none' then
    v_redeem := least((p_redeem/100)*100, (v_avail_pts/100)*100);
    v_redeem_disc := least((v_redeem/100)*10000, v_total - v_promo_disc);
    v_redeem := (v_redeem_disc/10000)::int * 100;
  end if;
  v_net := greatest(v_total - v_promo_disc - v_redeem_disc, 0);

  -- Khóa + kiểm tra tồn kho
  perform 1 from ingredients i where i.id in (
    select distinct r.ingredient_id from jsonb_to_recordset(p_items) as x(product_id uuid, qty int, variant_id uuid)
    join recipes r on r.product_id = x.product_id) for update;
  for v_ing in
    select r.ingredient_id as id, sum(r.qty * x.qty) as need
    from jsonb_to_recordset(p_items) as x(product_id uuid, qty int, variant_id uuid)
    join recipes r on r.product_id = x.product_id group by r.ingredient_id
  loop
    select stock, name into v_new_stock, v_ing_name from ingredients where id = v_ing.id;
    if v_new_stock < v_ing.need then raise exception 'Không đủ nguyên liệu: %', v_ing_name using errcode='P0001'; end if;
  end loop;

  v_code := 'DH' || lpad(nextval('order_code_seq')::text, 4, '0');

  insert into orders (code, user_id, crm_customer_id, customer_name, source, status, total_amount, discount, payment, shipping_address, served_by_name, promo_code)
  values (v_code, case when v_loyalty='profile' then v_target else null end,
          case when v_loyalty='customer' then v_target else null end,
          v_cust_name, p_source, 'paid', v_net, (v_total - v_net), p_payment, p_address, p_served_by,
          case when v_promo_disc > 0 then upper(trim(p_promo_code)) else null end)
  returning id into v_order_id;

  insert into order_items (order_id, product_id, variant_id, quantity, price)
  select v_order_id, x.product_id, x.variant_id, x.qty, coalesce(v.price, p.price)
  from jsonb_to_recordset(p_items) as x(product_id uuid, qty int, variant_id uuid)
  join products p on p.id = x.product_id
  left join product_variants v on v.id = x.variant_id and v.product_id = x.product_id;

  for v_ing in
    select r.ingredient_id as id, sum(r.qty * x.qty) as need
    from jsonb_to_recordset(p_items) as x(product_id uuid, qty int, variant_id uuid)
    join recipes r on r.product_id = x.product_id group by r.ingredient_id
  loop
    update ingredients set stock = stock - v_ing.need where id = v_ing.id
      returning stock, min_stock, name into v_new_stock, v_min_stock, v_ing_name;
    insert into inventory_tx (ingredient_id, change, reason) values (v_ing.id, -v_ing.need, 'Bán hàng ' || v_code);
    if v_new_stock < v_min_stock then
      v_low := v_low || jsonb_build_object('id', v_ing.id, 'name', v_ing_name, 'stock', v_new_stock, 'min_stock', v_min_stock);
    end if;
  end loop;

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

  return jsonb_build_object('ok', true, 'code', v_code, 'total', v_net, 'discount', (v_total - v_net),
    'promo_discount', v_promo_disc, 'redeemed', v_redeem, 'earned', v_earned,
    'logged_in', v_loyalty <> 'none', 'low_stock', v_low);
end;
$$;
