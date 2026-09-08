-- ============================================================
-- FIX: RLS ทั้งหมดที่เกี่ยวกับ "ออเดอร์" — รันซ้ำได้ปลอดภัย (idempotent)
-- วิธีใช้: Supabase Dashboard > SQL Editor > New Query > วางทั้งไฟล์ > Run
-- จุดประสงค์: ให้แน่ใจว่า "คนหิ้ว" (carrier) เห็นออเดอร์ที่เข้ามาในเที่ยวของตัวเอง
-- และ "ผู้ซื้อ" (buyer) เห็น/สร้าง/แก้ไขออเดอร์ของตัวเองได้ตามที่ควร
-- ============================================================

-- เปิด RLS (ถ้าเปิดอยู่แล้วจะไม่มีผลอะไร ไม่พัง)
alter table public.orders enable row level security;
alter table public.carrier_trips enable row level security;
alter table public.trip_menu_items enable row level security;
alter table public.buyer_addresses enable row level security;
alter table public.profiles enable row level security;

-- ------------------------------------------------------------
-- ORDERS
-- ------------------------------------------------------------
drop policy if exists "orders_select_buyer" on public.orders;
create policy "orders_select_buyer" on public.orders
  for select using (auth.uid() = buyer_id);

drop policy if exists "orders_select_carrier" on public.orders;
create policy "orders_select_carrier" on public.orders
  for select using (
    exists (
      select 1 from public.carrier_trips t
      where t.id = orders.trip_id and t.carrier_id = auth.uid()
    )
  );

drop policy if exists "orders_insert_buyer" on public.orders;
create policy "orders_insert_buyer" on public.orders
  for insert with check (auth.uid() = buyer_id);

drop policy if exists "orders_update_buyer" on public.orders;
create policy "orders_update_buyer" on public.orders
  for update using (auth.uid() = buyer_id);

drop policy if exists "orders_update_carrier" on public.orders;
create policy "orders_update_carrier" on public.orders
  for update using (
    exists (
      select 1 from public.carrier_trips t
      where t.id = orders.trip_id and t.carrier_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- CARRIER_TRIPS (ต้องอ่านได้ทุกคน ไม่งั้น subquery ข้างบนจะมองไม่เห็นด้วย)
-- ------------------------------------------------------------
drop policy if exists "trips_select_all" on public.carrier_trips;
create policy "trips_select_all" on public.carrier_trips for select using (true);

drop policy if exists "trips_insert_own_verified" on public.carrier_trips;
create policy "trips_insert_own_verified" on public.carrier_trips
  for insert with check (
    auth.uid() = carrier_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.carrier_verified = true)
  );

drop policy if exists "trips_update_own" on public.carrier_trips;
create policy "trips_update_own" on public.carrier_trips
  for update using (auth.uid() = carrier_id);

drop policy if exists "trips_delete_own" on public.carrier_trips;
create policy "trips_delete_own" on public.carrier_trips
  for delete using (auth.uid() = carrier_id);

-- ------------------------------------------------------------
-- TRIP_MENU_ITEMS
-- ------------------------------------------------------------
drop policy if exists "menu_select_all" on public.trip_menu_items;
create policy "menu_select_all" on public.trip_menu_items for select using (true);

drop policy if exists "menu_insert_owner" on public.trip_menu_items;
create policy "menu_insert_owner" on public.trip_menu_items
  for insert with check (
    exists (select 1 from public.carrier_trips t where t.id = trip_id and t.carrier_id = auth.uid())
  );

-- ------------------------------------------------------------
-- BUYER_ADDRESSES (ผู้ซื้อต้องอ่าน/สร้างที่อยู่ของตัวเองได้ ไม่งั้น submit order ไม่ผ่านตั้งแต่ต้น)
-- ------------------------------------------------------------
drop policy if exists "buyer_addresses_select_own" on public.buyer_addresses;
create policy "buyer_addresses_select_own" on public.buyer_addresses for select using (auth.uid() = profile_id);

drop policy if exists "buyer_addresses_insert_own" on public.buyer_addresses;
create policy "buyer_addresses_insert_own" on public.buyer_addresses for insert with check (auth.uid() = profile_id);

drop policy if exists "buyer_addresses_update_own" on public.buyer_addresses;
create policy "buyer_addresses_update_own" on public.buyer_addresses for update using (auth.uid() = profile_id);

drop policy if exists "buyer_addresses_delete_own" on public.buyer_addresses;
create policy "buyer_addresses_delete_own" on public.buyer_addresses for delete using (auth.uid() = profile_id);

-- ------------------------------------------------------------
-- PROFILES (ต้องอ่านได้ทุกคน เพราะหน้าออเดอร์ join ชื่อผู้ซื้อ/คนหิ้วเสมอ)
-- ------------------------------------------------------------
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles for select using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- ============================================================
-- เช็คผลลัพธ์: ดู policy ทั้งหมดที่มีอยู่จริงตอนนี้บนตาราง orders
-- ============================================================
select schemaname, tablename, policyname, cmd
from pg_policies
where tablename in ('orders', 'carrier_trips', 'trip_menu_items', 'buyer_addresses', 'profiles')
order by tablename, cmd;
