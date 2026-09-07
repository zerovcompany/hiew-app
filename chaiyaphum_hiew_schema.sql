-- ============================================================
-- CHAIYAPHUM HIEW APP — Supabase (Postgres) Schema
-- แอปรับหิ้วของ สำหรับคนชัยภูมิ
-- วิธีใช้: Supabase Dashboard > SQL Editor > New Query > วางไฟล์นี้ทั้งหมด > Run
-- ============================================================

-- ต้องเปิด extension สำหรับ uuid
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1) PROFILES — โปรไฟล์ผู้ใช้ (ต่อยอดจาก auth.users ของ Supabase)
--    ผู้ใช้ 1 คน เป็นได้ทั้งคนซื้อ และ/หรือ คนหิ้ว
-- ------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  line_user_id text unique,           -- sub จาก LINE OIDC
  display_name text not null,
  avatar_url text,
  phone text,
  is_buyer boolean not null default true,
  is_carrier boolean not null default false,
  carrier_verified boolean not null default false,  -- sync มาจาก carrier_verifications
  rating_avg numeric(3,2) default 0,
  rating_count int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2) CARRIER VERIFICATIONS — ยืนยันตัวตนคนหิ้ว
-- ------------------------------------------------------------
create type verification_status as enum ('pending', 'approved', 'rejected');

create table public.carrier_verifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  id_card_number text,                 -- แนะนำเข้ารหัส/ปิดบางส่วนตอนแสดงผลใน frontend
  id_card_image_url text not null,     -- เก็บใน Supabase Storage (bucket ส่วนตัว ห้าม public)
  selfie_with_id_url text not null,
  status verification_status not null default 'pending',
  reject_reason text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 3) SHOPS — ร้านค้า (ไว้ใช้ค้นหา/แสดงร้านยอดนิยม)
-- ------------------------------------------------------------
create table public.shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,                       -- เช่น ชานม, ของกิน, เครื่องสำอาง
  image_url text,
  address_hint text,                   -- เช่น "ตลาดโต้รุ่งชัยภูมิ"
  order_count int not null default 0,  -- นับยอดสั่งสำเร็จ ใช้จัดอันดับความนิยม
  created_at timestamptz not null default now()
);

create extension if not exists pg_trgm;
create index idx_shops_order_count on public.shops (order_count desc);
create index idx_shops_name_trgm on public.shops using gin (name gin_trgm_ops);

-- ------------------------------------------------------------
-- 4) CARRIER TRIPS — "เที่ยวหิ้ว" ที่คนหิ้วเปิดรับออเดอร์
-- ------------------------------------------------------------
create type trip_status as enum ('open', 'closed', 'completed', 'cancelled');

create table public.carrier_trips (
  id uuid primary key default gen_random_uuid(),
  carrier_id uuid not null references public.profiles(id) on delete cascade,
  shop_id uuid references public.shops(id),      -- ถ้าเลือกจากร้านที่มีอยู่
  shop_name_text text not null,                  -- เผื่อร้านยังไม่มีในระบบ พิมพ์เองได้
  description text,                              -- รายละเอียดเพิ่มเติม เช่น "หิ้วชานมไข่มุก โกลด์ ทีคาเฟ่"
  order_cutoff_at timestamptz not null,           -- ปิดรับออเดอร์กี่โมง
  delivery_date date not null,                    -- วันที่ส่งของ
  delivery_time_start time not null,
  delivery_time_end time not null,
  delivery_location text not null,                -- จุดนัดรับ
  service_fee numeric(10,2) not null,             -- ค่าหิ้วต่อรายการ/ต่อออเดอร์
  fee_type text not null default 'per_order' check (fee_type in ('per_order','per_item','flat')),
  max_orders int,                                 -- จำกัดจำนวนออเดอร์ (ถ้ามี)
  status trip_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_trips_status on public.carrier_trips (status, delivery_date);
create index idx_trips_shop on public.carrier_trips (shop_id);

-- ------------------------------------------------------------
-- 5) TRIP MENU ITEMS — เมนูที่คนหิ้วระบุไว้ล่วงหน้า (optional ให้คนซื้อเลือก)
-- ------------------------------------------------------------
create table public.trip_menu_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.carrier_trips(id) on delete cascade,
  item_name text not null,
  reference_price numeric(10,2),   -- ราคาสินค้าโดยประมาณ (ไม่รวมค่าหิ้ว)
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 6) ORDERS — ออเดอร์ของคนซื้อในแต่ละเที่ยวหิ้ว
-- ------------------------------------------------------------
create type order_status as enum (
  'pending',      -- รอคนหิ้วยืนยัน
  'confirmed',    -- คนหิ้วรับออเดอร์แล้ว
  'purchased',    -- ซื้อของแล้ว
  'delivered',    -- ส่งมอบแล้ว
  'cancelled'
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.carrier_trips(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  menu_item_id uuid references public.trip_menu_items(id),
  item_description text not null,       -- ชื่อ/รายละเอียดสินค้าที่สั่ง (custom ได้)
  quantity int not null default 1,
  item_price numeric(10,2),             -- ราคาสินค้า (อาจยังไม่รู้แน่ชัดตอนสั่ง)
  service_fee_snapshot numeric(10,2) not null,  -- ก็อปค่าหิ้ว ณ ตอนสั่ง กันเที่ยวเปลี่ยนราคาทีหลัง
  total_price numeric(10,2) generated always as
    (coalesce(item_price,0) * quantity + service_fee_snapshot) stored,
  payment_slip_url text,
  status order_status not null default 'pending',
  buyer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_orders_trip on public.orders (trip_id);
create index idx_orders_buyer on public.orders (buyer_id);

-- ------------------------------------------------------------
-- 7) REVIEWS — รีวิว 2 ทิศทาง (ซื้อ<->หิ้ว)
-- ------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id),
  reviewee_id uuid not null references public.profiles(id),
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (order_id, reviewer_id)
);

-- ------------------------------------------------------------
-- 8) FAVORITES — ติดตามร้าน/คนหิ้ว
-- ------------------------------------------------------------
create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  shop_id uuid references public.shops(id) on delete cascade,
  carrier_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (
    (shop_id is not null and carrier_id is null) or
    (shop_id is null and carrier_id is not null)
  ),
  unique (profile_id, shop_id, carrier_id)
);

-- ============================================================
-- TRIGGERS: updated_at อัตโนมัติ
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger trg_trips_updated before update on public.carrier_trips
  for each row execute function public.set_updated_at();
create trigger trg_orders_updated before update on public.orders
  for each row execute function public.set_updated_at();

-- ============================================================
-- TRIGGER: อัปเดตยอดนิยมร้าน เมื่อออเดอร์ status = 'delivered'
-- ============================================================
create or replace function public.increment_shop_order_count()
returns trigger language plpgsql as $$
begin
  if new.status = 'delivered' and old.status is distinct from 'delivered' then
    update public.shops s
      set order_count = order_count + 1
      from public.carrier_trips t
      where t.id = new.trip_id and s.id = t.shop_id;
  end if;
  return new;
end;
$$;

create trigger trg_orders_shop_popularity
  after update on public.orders
  for each row execute function public.increment_shop_order_count();

-- ============================================================
-- TRIGGER: อัปเดต rating เฉลี่ยของ profile เมื่อมีรีวิวใหม่
-- ============================================================
create or replace function public.update_profile_rating()
returns trigger language plpgsql as $$
begin
  update public.profiles
    set rating_count = rating_count + 1,
        rating_avg = (
          select round(avg(rating)::numeric, 2) from public.reviews
          where reviewee_id = new.reviewee_id
        )
    where id = new.reviewee_id;
  return new;
end;
$$;

create trigger trg_reviews_update_rating
  after insert on public.reviews
  for each row execute function public.update_profile_rating();

-- ============================================================
-- TRIGGER: profile ถูกสร้างอัตโนมัติเมื่อมี auth.users ใหม่ (LINE Login)
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, line_user_id, display_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'sub',
    coalesce(new.raw_user_meta_data->>'name', 'ผู้ใช้ใหม่'),
    new.raw_user_meta_data->>'picture'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — สำคัญมาก เพราะมีข้อมูลบัตรประชาชน
-- ============================================================
alter table public.profiles enable row level security;
alter table public.carrier_verifications enable row level security;
alter table public.shops enable row level security;
alter table public.carrier_trips enable row level security;
alter table public.trip_menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.reviews enable row level security;
alter table public.favorites enable row level security;

-- PROFILES: ใครก็อ่านได้ (โชว์ชื่อ/rating), แก้ไขได้แค่ของตัวเอง
create policy "profiles_select_all" on public.profiles for select using (true);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- CARRIER_VERIFICATIONS: อ่าน/สร้างได้เฉพาะของตัวเอง, update ทำผ่าน service role (แอดมิน) เท่านั้น
create policy "verif_select_own" on public.carrier_verifications
  for select using (auth.uid() = profile_id);
create policy "verif_insert_own" on public.carrier_verifications
  for insert with check (auth.uid() = profile_id);

-- SHOPS: อ่านได้ทุกคน, insert ได้เฉพาะ user ที่ login แล้ว (เผื่อคนหิ้วเพิ่มร้านใหม่)
create policy "shops_select_all" on public.shops for select using (true);
create policy "shops_insert_auth" on public.shops for insert with check (auth.uid() is not null);

-- CARRIER_TRIPS: อ่านได้ทุกคน, สร้าง/แก้ไขได้เฉพาะเจ้าของเที่ยว และต้องยืนยันตัวตนแล้ว
create policy "trips_select_all" on public.carrier_trips for select using (true);
create policy "trips_insert_own_verified" on public.carrier_trips
  for insert with check (
    auth.uid() = carrier_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.carrier_verified = true)
  );
create policy "trips_update_own" on public.carrier_trips
  for update using (auth.uid() = carrier_id);

-- TRIP_MENU_ITEMS: อ่านได้ทุกคน, แก้ไขได้เฉพาะเจ้าของเที่ยว
create policy "menu_select_all" on public.trip_menu_items for select using (true);
create policy "menu_insert_owner" on public.trip_menu_items
  for insert with check (
    exists (select 1 from public.carrier_trips t where t.id = trip_id and t.carrier_id = auth.uid())
  );

-- ORDERS: buyer เห็น/สร้างออเดอร์ของตัวเอง, carrier เห็นออเดอร์ในเที่ยวของตัวเอง
create policy "orders_select_buyer" on public.orders
  for select using (auth.uid() = buyer_id);
create policy "orders_select_carrier" on public.orders
  for select using (
    exists (select 1 from public.carrier_trips t where t.id = trip_id and t.carrier_id = auth.uid())
  );
create policy "orders_insert_buyer" on public.orders
  for insert with check (auth.uid() = buyer_id);
create policy "orders_update_buyer" on public.orders
  for update using (auth.uid() = buyer_id);
create policy "orders_update_carrier" on public.orders
  for update using (
    exists (select 1 from public.carrier_trips t where t.id = trip_id and t.carrier_id = auth.uid())
  );

-- REVIEWS: อ่านได้ทุกคน, รีวิวได้เฉพาะคนที่เกี่ยวข้องกับออเดอร์นั้น
create policy "reviews_select_all" on public.reviews for select using (true);
create policy "reviews_insert_participant" on public.reviews
  for insert with check (auth.uid() = reviewer_id);

-- FAVORITES: เห็น/แก้ไขได้เฉพาะของตัวเอง
create policy "favorites_select_own" on public.favorites for select using (auth.uid() = profile_id);
create policy "favorites_insert_own" on public.favorites for insert with check (auth.uid() = profile_id);
create policy "favorites_delete_own" on public.favorites for delete using (auth.uid() = profile_id);

-- ============================================================
-- STORAGE BUCKETS (รันแยกใน SQL Editor ได้เลย หรือสร้างผ่าน Dashboard > Storage)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('verifications', 'verifications', false)  -- ห้าม public เด็ดขาด (บัตรประชาชน)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('shop-images', 'shop-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('payment-slips', 'payment-slips', false)
on conflict (id) do nothing;

-- policy: user อัปโหลดเข้าโฟลเดอร์ตัวเองได้เท่านั้น เช่น verifications/{user_id}/idcard.jpg
create policy "verif_bucket_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'verifications' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "verif_bucket_select_own" on storage.objects
  for select using (
    bucket_id = 'verifications' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- จบ schema
-- ============================================================
