-- Ads/Promo banner carousel ที่แอดมินอัปโหลดรูปแล้วโชว์เป็นสไลด์บนหน้าแรก
-- รันไฟล์นี้ใน Supabase SQL editor 1 ครั้ง

create table if not exists public.promo_banners (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  storage_path text,           -- path ของไฟล์ใน bucket banner-images ใช้ตอนลบรูปทิ้งจาก storage
  link_url text,               -- ไม่บังคับ: ลิงก์ที่จะพาไปเมื่อกดสไลด์ (ใส่ path ในแอป เช่น /trips/xxx หรือ URL ภายนอกก็ได้)
  sort_order integer not null default 0,  -- เลขน้อยแสดงก่อน ใช้จัดลำดับสไลด์
  is_active boolean not null default true, -- ปิดไว้ก่อนแล้วยังไม่อยากลบ ก็ปิดสวิตช์นี้แทนได้
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.promo_banners enable row level security;

drop policy if exists "banners_select_active_public" on public.promo_banners;
drop policy if exists "banners_select_admin" on public.promo_banners;
drop policy if exists "banners_admin_write" on public.promo_banners;

-- ผู้ใช้ทั่วไป (หน้าแรก) เห็นได้เฉพาะสไลด์ที่เปิดใช้งานอยู่
create policy "banners_select_active_public" on public.promo_banners
  for select using (is_active = true);

-- แอดมินเห็นได้ทุกสไลด์ (รวมที่ปิดอยู่) เพื่อจัดการในหน้าแอดมิน
create policy "banners_select_admin" on public.promo_banners
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- insert/update/delete ให้เฉพาะแอดมิน (API ฝั่ง server ใช้ service role อยู่แล้วซึ่งไม่ติด RLS
-- แต่ใส่ policy นี้ไว้ด้วยเผื่อมีคนเข้าจัดการผ่าน Supabase dashboard/แอปอื่นโดยตรง)
create policy "banners_admin_write" on public.promo_banners
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- bucket เก็บรูปแบนเนอร์ (public เพื่อให้โหลดรูปหน้าแรกได้โดยไม่ต้อง sign url)
insert into storage.buckets (id, name, public) values ('banner-images','banner-images',true)
on conflict (id) do nothing;

drop policy if exists "banner_images_admin_insert" on storage.objects;
drop policy if exists "banner_images_admin_update" on storage.objects;
drop policy if exists "banner_images_admin_delete" on storage.objects;

create policy "banner_images_admin_insert" on storage.objects for insert with check (
  bucket_id = 'banner-images' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
);
create policy "banner_images_admin_update" on storage.objects for update using (
  bucket_id = 'banner-images' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
);
create policy "banner_images_admin_delete" on storage.objects for delete using (
  bucket_id = 'banner-images' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
);
