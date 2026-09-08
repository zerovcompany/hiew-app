import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notifyOrderEvent } from "@/lib/line";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  const { data: order } = await supabaseAdmin.from("orders").select("id,buyer_id,status,trip_id,carrier_trips(carrier_id)").eq("id", params.id).maybeSingle();
  if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });
  const trip = Array.isArray(order.carrier_trips) ? order.carrier_trips[0] : order.carrier_trips;
  const isBuyer = order.buyer_id === userData.user.id;
  const isCarrier = trip?.carrier_id === userData.user.id;
  if (!isBuyer && !isCarrier) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (order.status === "cancelled" || order.status === "delivered") return NextResponse.json({ error: "ยกเลิกออเดอร์นี้ไม่ได้" }, { status: 400 });
  if (isCarrier && order.status !== "pending" && !reason) return NextResponse.json({ error: "กรุณาระบุเหตุผลก่อนยกเลิก" }, { status: 400 });
  const update = { status: "cancelled", cancelled_by: userData.user.id, cancelled_at: new Date().toISOString(), cancel_reason: reason || null };
  const { error } = await supabaseAdmin.from("orders").update(update).eq("id", order.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await notifyOrderEvent(order.id, "cancelled", userData.user.id);
  return NextResponse.json({ ok: true });
}
