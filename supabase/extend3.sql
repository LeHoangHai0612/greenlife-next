-- ============================================================
-- GreenLife — MỞ RỘNG 3: ảnh website (admin đổi được) + ảnh placeholder SP
-- Chạy SAU extend2.sql. An toàn chạy lại.
-- ============================================================

-- ---------- Ảnh dùng chung của website (hero, story, about...) ----------
create table if not exists site_images (
  key   text primary key,
  url   text not null,
  label text
);
alter table site_images enable row level security;
drop policy if exists site_images_read on site_images;
create policy site_images_read on site_images for select using (true);
drop policy if exists site_images_write on site_images;
create policy site_images_write on site_images for all using (is_staff()) with check (is_staff());

-- Ảnh mặc định (Unsplash) — admin có thể đổi tại /admin/hinh-anh
insert into site_images (key, url, label) values
('hero_left',  'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=1100&q=80', 'Hero — ảnh trái'),
('hero_right', 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?auto=format&fit=crop&w=1100&q=80', 'Hero — ảnh phải'),
('story_1',    'https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=1000&q=80', 'Câu chuyện — mục 1'),
('story_2',    'https://images.unsplash.com/photo-1601314002592-b8734bca6604?auto=format&fit=crop&w=1000&q=80', 'Câu chuyện — mục 2'),
('about_hero', 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=1200&q=80', 'Trang Giới thiệu — ảnh lớn')
on conflict (key) do nothing;

-- ---------- Gán ảnh placeholder cho sản phẩm theo nhóm (chỉ khi chưa có ảnh) ----------
update products p set image_url = 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80'
  from categories c where p.category_id = c.id and c.slug = 'kombucha' and (p.image_url is null or p.image_url = '');
update products p set image_url = 'https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=600&q=80'
  from categories c where p.category_id = c.id and c.slug = 'detox' and (p.image_url is null or p.image_url = '');
update products p set image_url = 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?auto=format&fit=crop&w=600&q=80'
  from categories c where p.category_id = c.id and c.slug = 'tra' and (p.image_url is null or p.image_url = '');
update products p set image_url = 'https://images.unsplash.com/photo-1601314002592-b8734bca6604?auto=format&fit=crop&w=600&q=80'
  from categories c where p.category_id = c.id and c.slug = 'sua-hat' and (p.image_url is null or p.image_url = '');
update products p set image_url = 'https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=600&q=80'
  from categories c where p.category_id = c.id and c.slug = 'sinh-to' and (p.image_url is null or p.image_url = '');
update products p set image_url = 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?auto=format&fit=crop&w=600&q=80'
  from categories c where p.category_id = c.id and c.slug = 'nuoc-uong' and (p.image_url is null or p.image_url = '');
