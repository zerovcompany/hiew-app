import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/requireAdmin";

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  const updates: Record<string, unknown> = {};
  for (const key of ["name", "category", "address_hint", "image_url"]) if (key in body) updates[key] = body[key] || null;
  const { error } = await supabaseAdmin.from("shops").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const form = await req.formData();
  const shopId = String(form.get("shop_id") ?? "");
  const file = form.get("file");
  if (!shopId || !(file instanceof File)) return NextResponse.json({ error: "missing shop_id/file" }, { status: 400 });
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `admin/${shopId}-${Date.now()}.${ext}`;
  const { error: uploadError } = await supabaseAdmin.storage.from("shop-images").upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type || "image/jpeg", upsert: true });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });
  const { data: urlData } = supabaseAdmin.storage.from("shop-images").getPublicUrl(path);
  const { error: updateError } = await supabaseAdmin.from("shops").update({ image_url: urlData.publicUrl }).eq("id", shopId);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  return NextResponse.json({ ok: true, image_url: urlData.publicUrl });
}
