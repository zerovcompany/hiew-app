import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/requireAdmin";

// ดึงรายการแบนเนอร์ทั้งหมด (รวมที่ปิดใช้งานอยู่) ให้หน้าแอดมินจัดการ
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { data, error } = await supabaseAdmin
    .from("promo_banners")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ banners: data ?? [] });
}

// อัปโหลดรูปแบนเนอร์ใหม่ + สร้างแถวในตาราง
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const form = await req.formData();
  const file = form.get("file");
  const linkUrl = String(form.get("link_url") ?? "").trim();
  const sortOrderRaw = form.get("sort_order");
  const sortOrder = sortOrderRaw ? Number(sortOrderRaw) : 0;

  if (!(file instanceof File)) return NextResponse.json({ error: "missing file" }, { status: 400 });

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `admin/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error: uploadError } = await supabaseAdmin.storage
    .from("banner-images")
    .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type || "image/jpeg", upsert: true });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: urlData } = supabaseAdmin.storage.from("banner-images").getPublicUrl(path);

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("promo_banners")
    .insert({
      image_url: urlData.publicUrl,
      link_url: linkUrl || null,
      sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
      storage_path: path,
    })
    .select()
    .single();
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  return NextResponse.json({ ok: true, banner: inserted });
}

// แก้ไข ลิงก์ / ลำดับ / เปิดปิดการแสดงผล
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if ("link_url" in body) updates.link_url = body.link_url || null;
  if ("sort_order" in body) updates.sort_order = Number(body.sort_order) || 0;
  if ("is_active" in body) updates.is_active = !!body.is_active;
  updates.updated_at = new Date().toISOString();

  const { error } = await supabaseAdmin.from("promo_banners").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// ลบแบนเนอร์ (ลบทั้งแถวในตารางและไฟล์รูปใน storage)
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const { data: existing } = await supabaseAdmin.from("promo_banners").select("storage_path").eq("id", id).maybeSingle();
  const { error } = await supabaseAdmin.from("promo_banners").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (existing?.storage_path) {
    await supabaseAdmin.storage.from("banner-images").remove([existing.storage_path]).catch(() => undefined);
  }
  return NextResponse.json({ ok: true });
}
