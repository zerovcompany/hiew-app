import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// แยก route นี้ออกมาเพื่อ "ตั้งคุกกี้ state ฝั่ง server" (ผ่าน Set-Cookie header)
// แทนที่จะตั้งด้วย document.cookie ฝั่ง client เหมือนเดิม
//
// เหตุผล: คุกกี้ที่ตั้งด้วย JS ฝั่ง client (script-writable cookie) จะโดนเบราว์เซอร์ที่มี
// tracking prevention เข้มงวด (Incognito / Private mode / เบราว์เซอร์รอง ๆ ที่ไม่ใช่ตัวหลัก
// ที่ผู้ใช้ใช้ประจำ) มองว่าน่าสงสัย เพราะรูปแบบคือ "ตั้งคุกกี้ปุ๊บ แล้วเด้งออกนอกโดเมนปั๊บ"
// (bounce-tracking pattern) เบราว์เซอร์เลยเคลียร์/บล็อกคุกกี้นั้นก่อนเด้งกลับมาถึง callback
// ทำให้เช็ค state ที่ callback แล้วไม่เจอคุกกี้ -> ขึ้น error "เซสชันหมดอายุ" ทั้งที่เพิ่งกด login ไป
//
// คุกกี้ที่ตั้งผ่าน Set-Cookie header จาก server (โดยเฉพาะแบบ HttpOnly) ไม่เข้าเงื่อนไขนี้
// จึงรอดจากการเด้งไป LINE แล้วเด้งกลับมาได้แน่นอนกว่ามาก
export async function GET(req: NextRequest) {
  const { origin } = new URL(req.url);
  const state = crypto.randomUUID();

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.NEXT_PUBLIC_LINE_CHANNEL_ID!,
    redirect_uri: `${origin}/api/auth/line/callback`,
    state,
    scope: "openid profile",
    bot_prompt: "normal",
  });

  const res = NextResponse.redirect(
    `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`
  );

  res.cookies.set("line_oauth_state", state, {
    path: "/",
    maxAge: 600,
    sameSite: "lax",
    httpOnly: true,
    secure: origin.startsWith("https://"),
  });

  return res;
}
