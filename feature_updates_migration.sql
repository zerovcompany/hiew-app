-- ============================================================
-- อัปเดต: ลบเที่ยวหิ้วได้ + รูปปกเที่ยวหิ้ว + แนบสลิปโอนเงิน
-- วิธีใช้: Supabase Dashboard > SQL Editor > New Query > วางไฟล์นี้ทั้งหมด > Run
-- (รันหลัง chaiyaphum_hiew_schema.sql, admin_migration.sql,
--  payment_and_shops_migration.sql ที่รันไปแล้วก่อนหน้านี้)
-- ============================================================

-- ------------------------------------------------------------
-- 1) คอลัมน์รูปปกของเที่ยวหิ้ว (โชว์ตอนคนซื้อเลือกดูเที่ยวหิ้ว)
-- ------------------------------------------------------------
alter table public.carrier_trips
  add column if not exists cover_image_url text;

-- ------------------------------------------------------------
-- 2) อนุญาตให้คนหิ้ว (เจ้าของเที่ยว) ลบเที่ยวหิ้วของตัวเองได้
--    หมายเหตุ: ออเดอร์ที่ผูกกับเที่ยวนี้จะถูกลบตามไปด้วยอัตโนมัติ
--    เพราะ orders.trip_id ตั้ง "on delete cascade" ไว้ตั้งแต่ schema หลักแล้ว
--    (ฝั่งแอปจะเตือนผู้ใช้ก่อนลบถ้ามีออเดอร์เข้ามาแล้ว)
-- ------------------------------------------------------------
drop policy if exists "trips_delete_own" on public.carrier_trips;
create policy "trips_delete_own" on public.carrier_trips
  for delete using (auth.uid() = carrier_id);

-- ------------------------------------------------------------
-- 3) Storage bucket รูปปกเที่ยวหิ้ว "trip-images"
--    public อ่านได้ทุกคน, อัปโหลด/แก้ไข/ลบได้เฉพาะเจ้าของไฟล์
--    (แอปจะอัปโหลดไปที่ path: {carrier_id}/{trip_id}-xxx.jpg)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('trip-images', 'trip-images', true)
on conflict (id) do nothing;

drop policy if exists "trip_images_select_all" on storage.objects;
create policy "trip_images_select_all" on storage.objects
  for select using (bucket_id = 'trip-images');

drop policy if exists "trip_images_insert_own" on storage.objects;
create policy "trip_images_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'trip-images' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "trip_images_update_own" on storage.objects;
create policy "trip_images_update_own" on storage.objects
  for update using (
    bucket_id = 'trip-images' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "trip_images_delete_own" on storage.objects;
create policy "trip_images_delete_own" on storage.objects
  for delete using (
    bucket_id = 'trip-images' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ------------------------------------------------------------
-- 4) Storage bucket สลิปโอนเงิน "payment-slips" (private, สร้างไว้แล้วใน schema หลัก)
--    แอปจะอัปโหลดไปที่ path: {order_id}/slip-xxx.jpg
--    คนที่ดู/อัปโหลดได้ = ผู้ซื้อของออเดอร์นั้น หรือคนหิ้วเจ้าของเที่ยวที่ออเดอร์นั้นผูกอยู่
--    (orders.payment_slip_url เก็บแค่ "path" ในบัคเก็ต ไม่ใช่ URL เต็ม
--     เพราะบัคเก็ตเป็น private ต้องขอ signed URL ตอนแสดงผลเสมอ)
-- ------------------------------------------------------------
drop policy if exists "slips_insert_buyer" on storage.objects;
create policy "slips_insert_buyer" on storage.objects
  for insert with check (
    bucket_id = 'payment-slips'
    and exists (
      select 1 from public.orders o
      where o.id::text = (storage.foldername(name))[1]
        and o.buyer_id = auth.uid()
    )
  );

drop policy if exists "slips_select_participant" on storage.objects;
create policy "slips_select_participant" on storage.objects
  for select using (
    bucket_id = 'payment-slips'
    and exists (
      select 1 from public.orders o
      join public.carrier_trips t on t.id = o.trip_id
      where o.id::text = (storage.foldername(name))[1]
        and (o.buyer_id = auth.uid() or t.carrier_id = auth.uid())
    )
  );

-- ============================================================
-- จบ migration
-- ============================================================
