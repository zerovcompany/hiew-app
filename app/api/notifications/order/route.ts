import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notifyOrderEvent, type OrderNotificationEvent } from "@/lib/line";

export async function POST(req: NextRequest) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const orderId = typeof body.order_id === "string" ? body.order_id : "";
  const event = body.event as OrderNotificationEvent;
  if (!orderId || !["created", "confirmed", "cancelled", "delivered"].includes(event)) return NextResponse.json({ error: "invalid request" }, { status: 400 });
  const { data: order } = await supabaseAdmin.from("orders").select("buyer_id,trip_id,carrier_trips(carrier_id)").eq("id", orderId).maybeSingle();
  const trip = order && (Array.isArray(order.carrier_trips) ? order.carrier_trips[0] : order.carrier_trips);
  if (!order || (order.buyer_id !== userData.user.id && trip?.carrier_id !== userData.user.id)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json(await notifyOrderEvent(orderId, event, userData.user.id));
}
