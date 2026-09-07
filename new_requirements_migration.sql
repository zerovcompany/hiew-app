-- ============================================================
-- หิ้วชัยภูมิ: อัปเดตตาม Requirement ใหม่
-- รันหลัง migration เดิมทั้งหมด
-- ============================================================

-- 1) ที่อยู่ผู้สั่งซื้อหลายรายการ + ปักหมุด
create table if not exists public.buyer_addresses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  label text not null default 'บ้าน',
  recipient_name text not null,
  phone text not null,
  address_text text not null,
  province text,
  district text,
  subdistrict text,
  postal_code text,
  latitude double precision,
  longitude double precision,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_buyer_addresses_profile on public.buyer_addresses(profile_id);

create or replace function public.set_default_buyer_address()
returns trigger language plpgsql as $$
begin
  if new.is_default then
    update public.buyer_addresses set is_default = false
    where profile_id = new.profile_id and id <> new.id;
  elsif not exists (select 1 from public.buyer_addresses where profile_id = new.profile_id and is_default = true and id <> new.id) then
    new.is_default := true;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_buyer_addresses_default on public.buyer_addresses;
create trigger trg_buyer_addresses_default before insert or update on public.buyer_addresses
for each row execute function public.set_default_buyer_address();

drop trigger if exists trg_buyer_addresses_updated on public.buyer_addresses;
create trigger trg_buyer_addresses_updated before update on public.buyer_addresses
for each row execute function public.set_updated_at();

alter table public.buyer_addresses enable row level security;
drop policy if exists "buyer_addresses_select_own" on public.buyer_addresses;
drop policy if exists "buyer_addresses_insert_own" on public.buyer_addresses;
drop policy if exists "buyer_addresses_update_own" on public.buyer_addresses;
drop policy if exists "buyer_addresses_delete_own" on public.buyer_addresses;
create policy "buyer_addresses_select_own" on public.buyer_addresses for select using (auth.uid() = profile_id);
create policy "buyer_addresses_insert_own" on public.buyer_addresses for insert with check (auth.uid() = profile_id);
create policy "buyer_addresses_update_own" on public.buyer_addresses for update using (auth.uid() = profile_id);
create policy "buyer_addresses_delete_own" on public.buyer_addresses for delete using (auth.uid() = profile_id);

-- 2) snapshot ข้อมูลจัดส่งไว้กับออเดอร์
alter table public.orders add column if not exists delivery_name text;
alter table public.orders add column if not exists delivery_phone text;
alter table public.orders add column if not exists delivery_address text;
alter table public.orders add column if not exists delivery_province text;
alter table public.orders add column if not exists delivery_district text;
alter table public.orders add column if not exists delivery_subdistrict text;
alter table public.orders add column if not exists delivery_postal_code text;
alter table public.orders add column if not exists delivery_latitude double precision;
alter table public.orders add column if not exists delivery_longitude double precision;
alter table public.orders add column if not exists cancelled_by uuid references public.profiles(id);
alter table public.orders add column if not exists cancel_reason text;
alter table public.orders add column if not exists cancelled_at timestamptz;

-- 3) LINE notification preferences + กันแจ้งซ้ำ
create table if not exists public.line_notification_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  enabled boolean not null default true,
  notify_order_created boolean not null default true,
  notify_order_confirmed boolean not null default true,
  notify_order_cancelled boolean not null default true,
  notify_order_delivered boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.line_notification_preferences enable row level security;
drop policy if exists "line_pref_select_own" on public.line_notification_preferences;
drop policy if exists "line_pref_insert_own" on public.line_notification_preferences;
drop policy if exists "line_pref_update_own" on public.line_notification_preferences;
create policy "line_pref_select_own" on public.line_notification_preferences for select using (auth.uid() = profile_id);
create policy "line_pref_insert_own" on public.line_notification_preferences for insert with check (auth.uid() = profile_id);
create policy "line_pref_update_own" on public.line_notification_preferences for update using (auth.uid() = profile_id);

create table if not exists public.line_notification_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  recipient_profile_id uuid not null references public.profiles(id) on delete cascade,
  event text not null check (event in ('created','confirmed','cancelled','delivered')),
  created_at timestamptz not null default now(),
  unique(order_id, recipient_profile_id, event)
);
alter table public.line_notification_logs enable row level security;

-- 4) รูปร้าน: bucket มีอยู่แล้วจาก schema เดิม แต่เพิ่ม policy สำหรับ admin ผ่าน dashboard/browser ถ้าต้องการ
insert into storage.buckets (id, name, public) values ('shop-images','shop-images',true) on conflict (id) do nothing;
drop policy if exists "shop_images_admin_insert" on storage.objects;
drop policy if exists "shop_images_admin_update" on storage.objects;
drop policy if exists "shop_images_admin_delete" on storage.objects;
create policy "shop_images_admin_insert" on storage.objects for insert with check (
  bucket_id = 'shop-images' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
);
create policy "shop_images_admin_update" on storage.objects for update using (
  bucket_id = 'shop-images' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
);
create policy "shop_images_admin_delete" on storage.objects for delete using (
  bucket_id = 'shop-images' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
);

-- 5) สถานะการเป็นเพื่อนกับ LINE Official Account
alter table public.profiles add column if not exists line_friend boolean not null default false;
