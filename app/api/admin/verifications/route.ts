import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/requireAdmin";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const statusFilter = req.nextUrl.searchParams.get("status") ?? "pending";

  let query = supabaseAdmin
    .from("carrier_verifications")
    .select("*, profiles(display_name, phone, avatar_url)")
    .order("created_at", { ascending: true });

  if (statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const withSignedUrls = await Promise.all(
    (data ?? []).map(async (row) => {
      const [idCard, selfie] = await Promise.all([
        supabaseAdmin.storage.from("verifications").createSignedUrl(row.id_card_image_url, 300),
        supabaseAdmin.storage.from("verifications").createSignedUrl(row.selfie_with_id_url, 300),
      ]);
      return {
        ...row,
        id_card_url_signed: idCard.data?.signedUrl ?? null,
        selfie_url_signed: selfie.data?.signedUrl ?? null,
      };
    })
  );

  return NextResponse.json({ data: withSignedUrls });
}
