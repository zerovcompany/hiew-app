import { NextRequest } from "next/server";
import { supabaseAdmin } from "./admin";

/**
 * ตรวจสอบว่าผู้เรียก API เป็นแอดมินจริง (profiles.is_admin = true)
 * ใช้ service role key เฉพาะฝั่ง server เท่านั้น — ห้าม import ไฟล์นี้ใน client component
 */
export async function requireAdmin(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");

  if (!token) {
    return { error: "unauthorized" as const, status: 401 };
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData.user) {
    return { error: "unauthorized" as const, status: 401 };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, is_admin")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (profileError || !profile?.is_admin) {
    return { error: "forbidden" as const, status: 403 };
  }

  return { userId: userData.user.id };
}
