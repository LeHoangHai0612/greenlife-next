-- ============================================================
-- GreenLife — MỞ RỘNG 4: bảo mật đặt hàng + hủy/hoàn đơn + audit log
-- Chạy SAU extend3.sql. An toàn chạy lại.
-- ============================================================

-- ---------- Nhật ký thao tác (audit log — NFR-03) ----------
create table if not exists audit_log (
  id         uuid primary key default gen_random_uuid(),
  actor      uuid,
  actor_name text,
  action     text not null,
  entity     text,
  detail     text,
  created_at timestamptz not null default now()
);
alter table audit_log enable row level security;
drop policy if exists audit_staff on audit_log;
create policy audit_staff on audit_log for all using (is_staff()) with check (is_staff());

-- ============================================================
-- place_order v4 — thêm chốt bảo mật:
--  • Đơn online (source <> 'Tại quầy') BẮT BUỘC đăng nhập.
--  • Bán tại quầy (source = 'Tại quầy') BẮT BUỘC là nhân viên.
-- ============================================================
drop function if exists place_order(jsonb, text, text, text, uuid, int, text, text);
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
  -- Chốt bảo mật
  if p_source = 'Tại quầy' then
    if not is_staff() then raise exception 'Chỉ nhân viên được bán tại quầy' using errcode='P0001'; end if;
  elsif v_uid is null then
    raise exception 'Vui lòng đăng nhập để đặt hàng' using errcode='P0001';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Đơn hàng trống' using errcode='P0001'; end if;
  if exists (select 1 from jsonb_to_recordset(p_items) as x(product_id uuid, qty int, variant_id uuid) where x.qty is null or x.qty <= 0) then
    raise exception 'Số lượng phải là số nguyên dương' using errcode='P0001'; end if;

  select count(*), count(p.id) into v_n_items, v_n_matched
  from jsonb_to_recordset(p_items) as x(product_id uuid, qty int, variant_id uuid)
  left join products p on p.id = x.product_id and p.is_active;
  if v_n_matched < v_n_items then raise exception 'Đơn chứa sản phẩm không hợp lệ' using errcode='P0001'; end if;

  select coalesce(sum(x.qty * coalesce(v.price, p.price)),0) into v_total
  from jsonb_to_recordset(p_items) as x(product_id uuid, qty int, variant_id uuid)
  join products p on p.id = x.product_id
  left join product_variants v on v.id = x.variant_id and v.product_id = x.product_id;

  if p_crm_customer_id is not null then
    v_loyalty := 'customer'; v_target := p_crm_customer_id;
    select name, points into v_cust_name, v_avail_pts from customers where id = v_target;
    if v_cust_name is null then raise exception 'Khách CRM không tồn tại' using errcode='P0001'; end if;
  elsif p_source <> 'Tại quầy' and v_uid is not null then
    v_loyalty := 'profile'; v_target := v_uid;
    select coalesce(full_name,'Khách'), points into v_cust_name, v_avail_pts from profiles where id = v_uid;
  elsif p_source = 'Tại quầy' then v_cust_name := 'Khách vãng lai';
  else v_cust_name := 'Khách online'; end if;

  if p_promo_code is not null and length(trim(p_promo_code)) > 0 then
    select * into v_promo from promotions where code = upper(trim(p_promo_code)) and active limit 1;
    if found and v_total >= v_promo.min_total then
      if v_promo.kind = 'percent' then v_promo_disc := floor(v_total * v_promo.value / 100);
      else v_promo_disc := v_promo.value; end if;
      v_promo_disc := least(v_promo_disc, v_total);
    end if;
  end if;

  if p_redeem > 0 and v_loyalty <> 'none' then
    v_redeem := least((p_redeem/100)*100, (v_avail_pts/100)*100);
    v_redeem_disc := least((v_redeem/100)*10000, v_total - v_promo_disc);
    v_redeem := (v_redeem_disc/10000)::int * 100;
  end if;
  v_net := greatest(v_total - v_promo_disc - v_redeem_disc, 0);

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

-- ============================================================
-- cancel_order — hủy đơn: hoàn kho theo BOM + đảo tích điểm (staff)
-- ============================================================
create or replace function cancel_order(p_order_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_o orders%rowtype; v_earned int; v_ing record;
begin
  if not is_staff() then raise exception 'Không có quyền' using errcode='P0001'; end if;
  select * into v_o from orders where id = p_order_id;
  if not found then raise exception 'Không tìm thấy đơn' using errcode='P0001'; end if;
  if v_o.status = 'cancelled' then raise exception 'Đơn đã hủy trước đó' using errcode='P0001'; end if;

  -- Hoàn kho theo công thức của các món trong đơn
  for v_ing in
    select r.ingredient_id as id, sum(r.qty * oi.quantity) as qty
    from order_items oi join recipes r on r.product_id = oi.product_id
    where oi.order_id = p_order_id group by r.ingredient_id
  loop
    update ingredients set stock = stock + v_ing.qty where id = v_ing.id;
    insert into inventory_tx (ingredient_id, change, reason) values (v_ing.id, v_ing.qty, 'Hủy đơn ' || v_o.code);
  end loop;

  -- Đảo tích điểm/chi tiêu (trừ lại số đã cộng)
  v_earned := floor(v_o.total_amount / 10000);
  if v_o.crm_customer_id is not null then
    update customers set points = greatest(points - v_earned, 0),
      total_spend = greatest(total_spend - v_o.total_amount, 0) where id = v_o.crm_customer_id;
  elsif v_o.user_id is not null then
    update profiles set points = greatest(points - v_earned, 0),
      total_spend = greatest(total_spend - v_o.total_amount, 0) where id = v_o.user_id;
  end if;

  update orders set status = 'cancelled' where id = p_order_id;
  return jsonb_build_object('ok', true, 'code', v_o.code);
end;
$$;

-- ============================================================
-- Ảnh riêng cho từng sản phẩm (chỉ thay ảnh placeholder Unsplash,
-- giữ nguyên ảnh do admin tự tải lên Storage)
-- ============================================================
do $$
declare ids text[] := array[
  'photo-1556679343-c7306c1976bc','photo-1571934811356-5cc061b6821f',
  'photo-1546173159-315724a31696','photo-1601314002592-b8734bca6604'];
  r record; i int := 0;
begin
  for r in select id from products where is_combo = false order by created_at loop
    update products
      set image_url = 'https://images.unsplash.com/' || ids[(i % array_length(ids,1)) + 1] || '?auto=format&fit=crop&w=600&q=80'
      where id = r.id and (image_url is null or image_url like 'https://images.unsplash.com/%');
    i := i + 1;
  end loop;
end $$;
