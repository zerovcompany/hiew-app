-- ============================================================
-- อัปเดต: รองรับการรับเงินของคนหิ้วผ่าน "เลขบัญชีธนาคาร" เพิ่มเติมจากพร้อมเพย์
-- + ให้คนซื้อเลือกได้ว่าจะโอนผ่านพร้อมเพย์หรือเลขบัญชีธนาคาร
-- วิธีใช้: Supabase Dashboard > SQL Editor > วางไฟล์นี้ > Run
-- (รันหลัง payment_and_shops_migration.sql)
-- ============================================================

-- 1) ข้อมูลบัญชีธนาคารของคนหิ้ว (เผื่อบางคนไม่มีพร้อมเพย์ อยากให้โอนเข้าเลขบัญชีแทน)
alter table public.profiles
  add column if not exists bank_code text;              -- รหัสธนาคาร เช่น kbank, scb (อ้างอิงจาก lib/banks.ts ฝั่งแอป)

alter table public.profiles
  add column if not exists bank_account_number text;     -- เลขที่บัญชี

alter table public.profiles
  add column if not exists bank_account_name text;       -- ชื่อบัญชี (ไว้ให้คนซื้อตรวจสอบก่อนโอน)

-- 2) บันทึกว่าออเดอร์ที่เลือก "จ่ายเลย" นั้น คนซื้อเลือกโอนผ่านช่องทางไหน (พร้อมเพย์ หรือ เลขบัญชี)
alter table public.orders
  add column if not exists payment_channel text
    check (payment_channel is null or payment_channel in ('promptpay', 'bank_account'));
