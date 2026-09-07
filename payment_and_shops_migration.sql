-- ============================================================
-- อัปเดต: ร้านค้าที่มีอยู่แล้วในระบบ + การชำระเงิน (จ่ายเลย/จ่ายตอนรับของ) + พร้อมเพย์
-- วิธีใช้: Supabase Dashboard > SQL Editor > วางไฟล์นี้ > Run
-- (รันหลัง chaiyaphum_hiew_schema.sql และ admin_migration.sql)
-- ============================================================

-- 1) พร้อมเพย์ของคนหิ้ว (เบอร์โทร หรือ เลขบัตรประชาชน) ไว้โชว์ QR ให้คนซื้อโอนตอน "จ่ายเลย"
alter table public.profiles
  add column if not exists promptpay_id text;

-- 2) วิธีชำระเงินและสถานะการจ่ายของแต่ละออเดอร์
alter table public.orders
  add column if not exists payment_method text not null default 'pay_on_delivery'
    check (payment_method in ('pay_now', 'pay_on_delivery'));

alter table public.orders
  add column if not exists payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'paid'));

-- 3) ดัชนีช่วยค้นหาร้านซ้ำแบบไม่สนตัวพิมพ์เล็ก/ใหญ่ (ใช้ตอนเช็คว่าร้านนี้เคยมีในระบบหรือยัง
--    ก่อนสร้างร้านใหม่ตอนเปิดรับหิ้ว — ป้องกันร้านเดียวกันถูกสร้างซ้ำหลายรายการ)
create index if not exists idx_shops_name_lower on public.shops (lower(name));

-- หมายเหตุ: ฝั่งแอปจะเช็คชื่อร้านซ้ำ (case-insensitive) ก่อน insert เสมอ
-- ถ้าพบร้านเดิมจะผูก shop_id กับร้านเดิมแทนการสร้างร้านใหม่
