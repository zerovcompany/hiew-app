import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

function verifySignature(body: string, signature: string | null) {
  // สำคัญ: webhook นี้มาจาก LINE Official Account (Messaging API channel)
  // ซึ่งเป็นคนละ channel กับ LINE Login channel ที่ใช้ตอน login (คนละ channel secret กัน)
  // เดิมโค้ดเคยใช้ LINE_CHANNEL_SECRET (secret ของ Login channel) ตรวจลายเซ็น ทำให้ verify ไม่ผ่านเสมอ (401)
  const secret = process.env.LINE_MESSAGING_CHANNEL_SECRET;
  if (!signature || !secret) return false;
  const digestBuf = crypto.createHmac("sha256", secret).update(body).digest();
  const signatureBuf = Buffer.from(signature, "base64");
  // ต้องเช็คความยาวก่อน ไม่งั้น timingSafeEqual จะ throw แทนที่จะ return false เมื่อความยาวไม่เท่ากัน
  if (digestBuf.length !== signatureBuf.length) return false;
  return crypto.timingSafeEqual(digestBuf, signatureBuf);
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifySignature(raw, req.headers.get("x-line-signature"))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(raw);
  for (const event of payload.events ?? []) {
    const lineUserId = event?.source?.userId;
    if (!lineUserId) continue;

    if (event.type === "follow") {
      await supabaseAdmin.from("profiles").update({ line_friend: true, line_user_id: lineUserId }).eq("line_user_id", lineUserId);
    } else if (event.type === "unfollow") {
      await supabaseAdmin.from("profiles").update({ line_friend: false }).eq("line_user_id", lineUserId);
    }
  }

  return NextResponse.json({ ok: true });
}
