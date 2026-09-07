import { supabaseAdmin } from "@/lib/supabase/admin";

export type OrderNotificationEvent = "created" | "confirmed" | "cancelled" | "delivered";

const templates: Record<OrderNotificationEvent, (shop: string, item: string) => string> = {
  created: (shop, item) => `🛍️ มีออเดอร์ใหม่\nร้าน: ${shop}\nสินค้า: ${item}\nกรุณาเข้าแอปเพื่อตรวจสอบออเดอร์`,
  confirmed: (shop, item) => `✅ คนหิ้วรับออเดอร์แล้ว\nร้าน: ${shop}\nสินค้า: ${item}`,
  cancelled: (shop, item) => `❌ ออเดอร์ถูกยกเลิก\nร้าน: ${shop}\nสินค้า: ${item}\nตรวจสอบรายละเอียดและเหตุผลได้ในแอป`,
  delivered: (shop, item) => `📦 ส่งมอบออเดอร์แล้ว\nร้าน: ${shop}\nสินค้า: ${item}\nขอบคุณที่ใช้บริการหิ้วชัยภูมิ`,
};

export async function notifyOrderEvent(orderId: string, event: OrderNotificationEvent, actorId?: string) {
  const token = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN;
  if (!token) return { ok: false, skipped: true, reason: "LINE_MESSAGING_CHANNEL_ACCESS_TOKEN is not configured" };

  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .select("id, buyer_id, item_description, status, trip_id, carrier_trips(shop_name_text, carrier_id)")
    .eq("id", orderId)
    .maybeSingle();
  if (error || !order) return { ok: false, skipped: true, reason: "order_not_found" };

  const trip = Array.isArray(order.carrier_trips) ? order.carrier_trips[0] : order.carrier_trips;
  const recipientId = event === "created" ? trip?.carrier_id : order.buyer_id;
  if (!recipientId || (actorId && recipientId === actorId)) return { ok: false, skipped: true, reason: "no_recipient" };

  const { data: profile } = await supabaseAdmin.from("profiles").select("line_user_id").eq("id", recipientId).maybeSingle();
  if (!profile?.line_user_id) return { ok: false, skipped: true, reason: "no_line_user_id" };

  const { data: preference } = await supabaseAdmin
    .from("line_notification_preferences")
    .select("enabled, notify_order_created, notify_order_confirmed, notify_order_cancelled, notify_order_delivered")
    .eq("profile_id", recipientId)
    .maybeSingle();
  if (preference && !preference.enabled) return { ok: false, skipped: true, reason: "notifications_disabled" };
  const allowed = event === "created" ? preference?.notify_order_created !== false
    : event === "confirmed" ? preference?.notify_order_confirmed !== false
    : event === "cancelled" ? preference?.notify_order_cancelled !== false
    : preference?.notify_order_delivered !== false;
  if (!allowed) return { ok: false, skipped: true, reason: "event_disabled" };

  const { data: log, error: logError } = await supabaseAdmin
    .from("line_notification_logs")
    .insert({ order_id: orderId, recipient_profile_id: recipientId, event })
    .select("id")
    .maybeSingle();
  if (logError || !log) return { ok: false, skipped: true, reason: "already_sent_or_log_failed" };

  const text = templates[event](trip?.shop_name_text ?? "ร้านค้า", order.item_description);
  const response = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ to: profile.line_user_id, messages: [{ type: "text", text }] }),
  });

  if (!response.ok) {
    await supabaseAdmin.from("line_notification_logs").delete().eq("id", log.id);
    return { ok: false, skipped: false, reason: `LINE ${response.status}` };
  }
  return { ok: true };
}
