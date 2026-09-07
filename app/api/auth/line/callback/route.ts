import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// decode payload ของ JWT แบบไม่ verify signature
// ปลอดภัยในเคสนี้เพราะ id_token มาจากการเรียก LINE token endpoint ตรง ๆ ฝั่ง server
// (แลกด้วย client_secret) ไม่ใช่ค่าที่รับมาจาก browser ของผู้ใช้ จึงไม่ถูกปลอมได้ระหว่างทาง
// TODO (production, ถ้าอยากรัดกุมสุด): verify signature ด้วย LINE JWKS เพิ่มอีกชั้น
function decodeJwtPayload(token: string) {
  const payload = token.split(".")[1];
  const json = Buffer.from(payload, "base64").toString("utf-8");
  return JSON.parse(json);
}

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const returnedState = searchParams.get("state");
  const savedState = req.cookies.get("line_oauth_state")?.value;

  if (error || !code) {
    return NextResponse.redirect(`${origin}/login?error=line_denied`);
  }

  // CSRF check: state ที่ LINE ส่งกลับมาต้องตรงกับที่เราสร้างไว้ตอนกดปุ่มเข้าสู่ระบบ
  // กันไม่ให้มีคนหลอกให้ผู้ใช้ auth ด้วย code ของคนอื่น (login CSRF)
  if (!savedState || !returnedState || savedState !== returnedState) {
    const res = NextResponse.redirect(`${origin}/login?error=invalid_state`);
    res.cookies.delete("line_oauth_state");
    return res;
  }

  try {
    // 1) แลก code เป็น token กับ LINE
    const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: `${origin}/api/auth/line/callback`,
        client_id: process.env.NEXT_PUBLIC_LINE_CHANNEL_ID!,
        client_secret: process.env.LINE_CHANNEL_SECRET!,
      }),
    });

    if (!tokenRes.ok) {
      throw new Error(`LINE token exchange failed: ${await tokenRes.text()}`);
    }

    const tokenData = await tokenRes.json();
    const claims = decodeJwtPayload(tokenData.id_token);
    const lineUserId: string = claims.sub;
    const name: string = claims.name ?? "ผู้ใช้ LINE";
    const picture: string | undefined = claims.picture;

    // ตรวจสอบว่า user ได้เพิ่ม LINE Official Account ที่ผูกกับ LINE Login channel แล้วหรือยัง
    // LINE ระบุว่า friendship/v1/status ใช้ access token ที่มี profile scope ได้
    let lineFriend = false;
    if (tokenData.access_token) {
      const friendshipRes = await fetch("https://api.line.me/friendship/v1/status", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (friendshipRes.ok) {
        const friendship = await friendshipRes.json();
        lineFriend = friendship.friendFlag === true;
      }
    }

    // อีเมลสมมติผูกกับ LINE user id เพราะ LINE ไม่การันตีว่าจะได้อีเมลจริงเสมอไป
    const syntheticEmail = `line-${lineUserId}@chaiyaphum-hiew.local`;

    // 2) สร้าง auth user ใหม่ถ้ายังไม่เคยมี (ถ้ามีอยู่แล้วจะ error "already registered" ซึ่งเป็นเรื่องปกติ ข้ามได้)
    const { error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: syntheticEmail,
      email_confirm: true,
      user_metadata: { sub: lineUserId, name, picture },
    });
    // ใช้ error code แทนการเทียบข้อความ เพราะข้อความจริงจาก Supabase คือ
    // "already been registered" ไม่ใช่ "already registered" ตรงๆ (เทียบ string เดิมเลยพลาด)
    if (createErr && createErr.code !== "email_exists") {
      throw createErr;
    }

    // 3) สร้าง magic link แล้วส่งผู้ใช้ไปที่ลิงก์นั้นเพื่อรับ session
    const { data: linkData, error: linkErr } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: syntheticEmail,
        options: { redirectTo: `${origin}/auth/callback` },
      });

    if (linkErr || !linkData) throw linkErr;

    // 4) self-heal: การันตีว่ามีแถวใน profiles เสมอ ไม่พึ่ง trigger handle_new_user() อย่างเดียว
    //    เคสที่ trigger อาจไม่ทำงาน (เช่น แถว profiles ถูกลบไปแต่ auth user ยังอยู่ ทำให้ createUser
    //    ข้างบน error "already registered" และไม่มี insert ใหม่เกิดขึ้น) ก็ยังได้โปรไฟล์กลับมาเสมอ
    //    ไม่ทับข้อมูลเดิมถ้าผู้ใช้เคยตั้งค่าไว้แล้ว (insert เฉพาะตอนไม่มีแถวอยู่จริง ๆ)
    const uid = linkData.user?.id;
    if (uid) {
      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("id", uid)
        .maybeSingle();

      if (!existingProfile) {
        const { error: insertErr } = await supabaseAdmin.from("profiles").insert({
          id: uid,
          line_user_id: lineUserId,
          display_name: name,
          avatar_url: picture ?? null,
          line_friend: lineFriend,
        });
        // ถ้า insert ชนกับแถวที่เพิ่งถูกสร้างพร้อมกัน (race) หรือ trigger สร้างไปแล้วพอดี ไม่ต้อง throw
        if (insertErr && insertErr.code !== "23505") throw insertErr;
      }
    }

    // อัปเดตสถานะ LINE OA ทุกครั้งที่ login สำเร็จ เพื่อให้ปุ่มแจ้งเตือนสะท้อนสถานะล่าสุด
    if (uid) {
      const { error: profileUpdateError } = await supabaseAdmin
        .from("profiles")
        .update({ line_user_id: lineUserId, line_friend: lineFriend })
        .eq("id", uid);
      if (profileUpdateError) throw profileUpdateError;
    }

    const res = NextResponse.redirect(linkData.properties.action_link);
    res.cookies.delete("line_oauth_state");
    return res;
  } catch (err) {
    console.error("LINE login error:", err);
    const res = NextResponse.redirect(`${origin}/login?error=server_error`);
    res.cookies.delete("line_oauth_state");
    return res;
  }
}
