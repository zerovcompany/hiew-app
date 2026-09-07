import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/requireAdmin";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json().catch(() => ({}));
  const action = body.action as "approve" | "reject" | undefined;
  const rejectReason = typeof body.reject_reason === "string" ? body.reject_reason : null;

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  }

  const { data: verification, error: fetchError } = await supabaseAdmin
    .from("carrier_verifications")
    .select("id, profile_id")
    .eq("id", params.id)
    .maybeSingle();

  if (fetchError || !verification) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const { error: updateError } = await supabaseAdmin
    .from("carrier_verifications")
    .update({
      status: action === "approve" ? "approved" : "rejected",
      reject_reason: action === "reject" ? rejectReason : null,
      reviewed_by: auth.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", params.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (action === "approve") {
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ carrier_verified: true })
      .eq("id", verification.profile_id);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
