import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

function verifySignature(body: string, signature: string | null) {
  if (!signature || !process.env.LINE_CHANNEL_SECRET) return false;
  const digest = crypto.createHmac("sha256", process.env.LINE_CHANNEL_SECRET).update(body).digest("base64");
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
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
