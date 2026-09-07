# หิ้วชัยภูมิ

แอปรับหิ้วของสำหรับคนชัยภูมิ — Next.js 14 + Supabase + LINE Login

## 1. รันเครื่องตัวเอง (development)

```bash
npm install
cp .env.local.example .env.local
# แก้ .env.local ใส่ค่าจริงตามขั้นตอนด้านล่าง
npm run dev
```

เปิด http://localhost:3000

## 2. ตั้งค่า Supabase

1. สร้างโปรเจกต์ที่ https://supabase.com (แนะนำ region Singapore)
2. รันไฟล์ `chaiyaphum_hiew_schema.sql` ใน SQL Editor (สร้างตาราง + RLS + storage buckets ให้ครบ)
3. ไปที่ Settings > API คัดลอก:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key (secret! อย่า commit ขึ้น git) → `SUPABASE_SERVICE_ROLE_KEY`

## 3. ตั้งค่า LINE Login

1. ไปที่ https://developers.line.biz/console/ สร้าง Provider + Channel แบบ "LINE Login"
2. ใน channel settings เปิด **OpenID Connect** ให้ scope `openid`, `profile` ใช้งานได้
3. ใส่ **Callback URL**:
   - ตอน dev: `http://localhost:3000/api/auth/line/callback`
   - ตอน production: `https://your-domain.vercel.app/api/auth/line/callback`
4. คัดลอก Channel ID → `NEXT_PUBLIC_LINE_CHANNEL_ID`, Channel secret → `LINE_CHANNEL_SECRET`

### วิธีการทำงานของ login (สำคัญ ควรเข้าใจไว้)
เพราะ Supabase ไม่มี LINE เป็น provider สำเร็จรูป ระบบนี้เลยทำ bridge เอง:
```
ผู้ใช้กดปุ่ม LINE → LINE Authorize → /api/auth/line/callback
  (server แลก code เป็น id_token กับ LINE, สร้าง/หา user ใน Supabase,
   สร้าง magic link ด้วย service role key)
  → redirect ไปที่ magic link ของ Supabase
  → Supabase ยืนยันแล้ว redirect กลับมาที่ /auth/callback พร้อม session
  → เข้าสู่ระบบสำเร็จ
```
ปลอดภัยเพราะ service role key ใช้อยู่ฝั่ง server (route.ts) เท่านั้น ไม่เคยส่งไปที่ browser

## 4. Deploy ให้คนอื่นใช้งานได้ (ฟรี)

1. Push โค้ดขึ้น GitHub repo
2. ไปที่ https://vercel.com → New Project → เลือก repo นี้
3. ใส่ Environment Variables ทั้ง 5 ตัวจาก `.env.local` ในหน้า Vercel project settings
4. กด Deploy — จะได้ URL เช่น `https://chaiyaphum-hiew.vercel.app`
5. กลับไปแก้ Callback URL ใน LINE Developers Console ให้ตรงกับ URL จริงที่ได้จาก Vercel
6. เสร็จแล้ว! แชร์ลิงก์ให้คนชัยภูมิใช้งานได้เลย

## โครงสร้างโปรเจกต์

```
app/
  page.tsx                     หน้าแรก ค้นหาร้าน + ร้านยอดนิยม
  login/page.tsx                ปุ่มเข้าสู่ระบบด้วย LINE
  api/auth/line/callback/       แลก code → session
  auth/callback/page.tsx        รับ session แล้วเด้งเข้าแอป
  trips/page.tsx                รายการเที่ยวหิ้วทั้งหมด (กรองตามร้านได้)
  trips/[id]/page.tsx           รายละเอียดเที่ยว + ฟอร์มสั่งซื้อ
  trips/new/page.tsx            เปิดรับหิ้ว (ต้องยืนยันตัวตนก่อน)
  profile/page.tsx              โปรไฟล์ + อัปโหลดยืนยันตัวตน
  my-orders/page.tsx            ออเดอร์ของฉัน (ฝั่งคนซื้อ)
  my-trips/page.tsx             จัดการเที่ยว + อัปเดตสถานะออเดอร์ (ฝั่งคนหิ้ว)
lib/supabase/
  client.ts                     Supabase client ฝั่ง browser
  admin.ts                      Supabase client สิทธิ์เต็ม (server เท่านั้น)
```

## สิ่งที่ควรทำต่อ (แนะนำ ไม่บังคับ)

- **หน้าแอดมินอนุมัติยืนยันตัวตน**: ตอนนี้ต้องเข้า Supabase Dashboard > Table Editor > `carrier_verifications`
  แล้วแก้ `status` เป็น `approved` และแก้ `profiles.carrier_verified = true` ด้วยมือ ถ้าจะให้สะดวกขึ้นค่อยทำหน้า `/admin` ทีหลัง
- **แจ้งเตือนผ่าน LINE**: ใช้ LINE Messaging API ส่งข้อความหาคนซื้อ/คนหิ้วเมื่อออเดอร์เปลี่ยนสถานะ
- **หน้ารีวิว**: เพิ่มฟอร์มให้รีวิวกันได้หลังออเดอร์ status = delivered
- **verify id_token signature จริงจัง**: ตอนนี้ decode เฉยๆ เพื่อความเร็วตอน MVP ก่อน production ควร verify กับ LINE JWKS

## อัปเดต Requirement ล่าสุด

เพิ่มแล้วในชุดนี้:
- เบอร์โทรผู้สั่งซื้อ + บันทึกในโปรไฟล์
- ที่อยู่ผู้สั่งซื้อหลายรายการ พร้อมตั้งค่าเริ่มต้น
- ปักหมุดตำแหน่งจัดส่งบนแผนที่ OpenStreetMap/Leaflet และบันทึก latitude/longitude
- snapshot ที่อยู่และพิกัดลงในออเดอร์ เพื่อไม่ให้ที่อยู่เก่าเปลี่ยนตามโปรไฟล์ภายหลัง
- คนหิ้วยกเลิกออเดอร์ได้: สถานะ `pending` ไม่ต้องใส่เหตุผล; ถ้ารับออเดอร์แล้วต้องระบุเหตุผล
- Admin จัดการรูปภาพ/ข้อมูลร้านผ่าน `/admin/shops`
- เครดิต `Developed by SupremeP` ควรใส่ใน Footer ของระบบ
- LINE แจ้งเฉพาะ event สำคัญ: ออเดอร์ใหม่, รับออเดอร์, ยกเลิก, ส่งสำเร็จ และมีระบบเปิด/ปิดแจ้งเตือนต่อผู้ใช้

### Supabase
รัน `new_requirements_migration.sql` หลัง migration เดิมทั้งหมด

### LINE Messaging API
เพิ่ม `LINE_MESSAGING_CHANNEL_ACCESS_TOKEN` ใน `.env.local` จาก Messaging API channel ของ LINE Official Account
ถ้าไม่ตั้งค่า ระบบยังใช้งานออเดอร์ได้ตามปกติ แต่จะข้ามการส่ง LINE notification
