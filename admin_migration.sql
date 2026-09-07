-- ============================================================
-- เพิ่มระบบแอดมิน สำหรับหน้า /admin/verifications
-- วิธีใช้: Supabase Dashboard > SQL Editor > วางไฟล์นี้ > Run
-- (รันหลัง chaiyaphum_hiew_schema.sql เท่านั้น)
-- ============================================================

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- ตั้งให้ตัวเองเป็นแอดมิน (แก้ email เป็นของคุณ แล้วรันบรรทัดนี้ครั้งเดียว)
-- update public.profiles set is_admin = true
--   where id = (select id from auth.users where email = 'you@example.com');
--
-- ถ้า login ด้วย LINE ไม่มี email ใน auth.users ให้หา user id จากหน้า
-- Authentication > Users ใน Supabase Dashboard แล้วรันแทน:
-- update public.profiles set is_admin = true where id = 'PASTE-USER-UUID-HERE';

-- หมายเหตุ: หน้า /admin/verifications เรียกผ่าน API route ที่ใช้ service role key
-- (ข้าม RLS อยู่แล้ว) แต่ API route จะเช็ค is_admin ของผู้เรียกทุกครั้งก่อนทำงานจริง
-- จึงไม่จำเป็นต้องเพิ่ม RLS policy ใหม่สำหรับ carrier_verifications หรือ storage
