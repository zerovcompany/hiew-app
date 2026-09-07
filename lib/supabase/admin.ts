import { createClient } from "@supabase/supabase-js";

// ⚠️ ห้าม import ไฟล์นี้ในไฟล์ที่มี "use client" เด็ดขาด
// ใช้ service role key ซึ่งมีสิทธิ์เต็ม ต้องรันฝั่ง server เท่านั้น (API routes / route handlers)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
