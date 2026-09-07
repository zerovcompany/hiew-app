"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import type { CarrierTrip, PaymentMethod, TripMenuItem } from "@/lib/types";
import type { User } from "@supabase/supabase-js";
import { SkeletonCard } from "@/components/Skeleton";

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [trip, setTrip] = useState<CarrierTrip | null>(null);
  const [menuItems, setMenuItems] = useState<TripMenuItem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // ฟอร์มสั่งซื้อ
  const [selectedMenuId, setSelectedMenuId] = useState<string>("custom");
  const [itemDescription, setItemDescription] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [itemPrice, setItemPrice] = useState<string>("");
  const [buyerNote, setBuyerNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pay_on_delivery");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));

    const load = async () => {
      setLoading(true);
      const { data: tripData } = await supabase
        .from("carrier_trips")
        .select("*, profiles(display_name, rating_avg, rating_count, avatar_url, promptpay_id), shops(name)")
        .eq("id", id)
        .maybeSingle();
      setTrip(tripData as unknown as CarrierTrip);

      const { data: items } = await supabase
        .from("trip_menu_items")
        .select("*")
        .eq("trip_id", id);
      setMenuItems((items as TripMenuItem[]) ?? []);
      setLoading(false);
    };
    load();
  }, [id]);

  const handleSelectMenu = (menuId: string) => {
    setSelectedMenuId(menuId);
    if (menuId === "custom") {
      setItemDescription("");
      setItemPrice("");
    } else {
      const item = menuItems.find((m) => m.id === menuId);
      if (item) {
        setItemDescription(item.item_name);
        setItemPrice(item.reference_price?.toString() ?? "");
      }
    }
  };

  // คำนวณยอดรวม: ราคาสินค้า x จำนวน + ค่าหิ้ว (ค่าหิ้วคิดตาม fee_type ของเที่ยวนี้)
  const priceBreakdown = useMemo(() => {
    const qty = Math.max(1, quantity || 1);
    const unitPrice = itemPrice ? Number(itemPrice) : 0;
    const itemsSubtotal = unitPrice * qty;
    const fee = trip
      ? trip.fee_type === "per_item"
        ? trip.service_fee * qty
        : trip.service_fee // per_order หรือ flat คิดเหมาไม่คูณจำนวน
      : 0;
    return { itemsSubtotal, fee, total: itemsSubtotal + fee, hasKnownItemPrice: !!itemPrice };
  }, [itemPrice, quantity, trip]);

  const carrierPromptPay = trip?.profiles?.promptpay_id?.replace(/[^0-9]/g, "") ?? "";
  const promptPayQrUrl = carrierPromptPay
    ? `https://promptpay.io/${carrierPromptPay}/${priceBreakdown.total.toFixed(2)}.png`
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!user) {
      router.push("/login");
      return;
    }
    if (!trip) return;
    if (!itemDescription.trim()) {
      setFormError("กรุณาระบุสินค้าที่ต้องการสั่ง");
      return;
    }
    if (paymentMethod === "pay_now" && !carrierPromptPay) {
      setFormError("คนหิ้วยังไม่ได้ตั้งค่าพร้อมเพย์ กรุณาเลือก \"จ่ายตอนรับของ\" แทน");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("orders").insert({
      trip_id: trip.id,
      buyer_id: user.id,
      menu_item_id: selectedMenuId === "custom" ? null : selectedMenuId,
      item_description: itemDescription.trim(),
      quantity,
      item_price: itemPrice ? Number(itemPrice) : null,
      service_fee_snapshot: trip.service_fee,
      buyer_note: buyerNote.trim() || null,
      payment_method: paymentMethod,
    });
    setSubmitting(false);

    if (error) {
      setFormError("สั่งซื้อไม่สำเร็จ ลองใหม่อีกครั้ง");
      console.error(error);
    } else {
      setSubmitted(true);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-10">
        <div className="skeleton h-3 w-24 animate-shimmer" />
        <div className="skeleton mt-2 h-7 w-2/3 animate-shimmer" />
        <div className="mt-4"><SkeletonCard /></div>
      </main>
    );
  }

  if (!trip) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center text-ink/60">
        ไม่พบเที่ยวหิ้วนี้ อาจถูกลบหรือปิดไปแล้ว
      </main>
    );
  }

  const isClosed = trip.status !== "open" || new Date(trip.order_cutoff_at) < new Date();

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-10">
      <p className="text-xs font-medium text-mudmee">{trip.shop_name_text}</p>
      <h1 className="mt-1 font-display text-2xl text-ink">
        ส่ง {new Date(trip.delivery_date).toLocaleDateString("th-TH", { day: "numeric", month: "long" })}
        {" "}เวลา {trip.delivery_time_start.slice(0, 5)}-{trip.delivery_time_end.slice(0, 5)} น.
      </h1>

      <div className="mt-4 ticket-card p-4">
        <dl className="grid grid-cols-2 gap-y-2.5 text-sm">
          <dt className="text-ink/50">คนหิ้ว</dt>
          <dd className="text-right font-medium">{trip.profiles?.display_name}</dd>
          <dt className="text-ink/50">คะแนน</dt>
          <dd className="text-right font-medium">
            {trip.profiles?.rating_count ? `${trip.profiles.rating_avg} ⭐ (${trip.profiles.rating_count})` : "ยังไม่มีรีวิว"}
          </dd>
          <dt className="text-ink/50">จุดนัดรับ</dt>
          <dd className="text-right font-medium">{trip.delivery_location}</dd>
          <dt className="text-ink/50">ปิดรับออเดอร์</dt>
          <dd className="text-right font-medium">
            {new Date(trip.order_cutoff_at).toLocaleString("th-TH")}
          </dd>
          <dt className="text-ink/50">ค่าหิ้ว</dt>
          <dd className="text-right font-display text-base text-krachiao">
            {trip.service_fee.toFixed(0)} บาท / {trip.fee_type === "per_order" ? "ออเดอร์" : trip.fee_type === "per_item" ? "รายการ" : "เที่ยว"}
          </dd>
        </dl>
        {trip.description && (
          <p className="mt-3 border-t border-dashed border-ink/15 pt-3 text-sm text-ink/70">
            {trip.description}
          </p>
        )}
      </div>

      <section className="mt-8">
        <h2 className="font-display text-lg text-ink">สั่งซื้อ</h2>

        {isClosed ? (
          <p className="mt-3 rounded-xl bg-ink/5 p-4 text-sm text-ink/60">เที่ยวนี้ปิดรับออเดอร์แล้ว</p>
        ) : submitted ? (
          <div className="mt-3 ticket-card p-4 text-sm text-ink">
            สั่งซื้อเรียบร้อย รอคนหิ้วยืนยันออเดอร์ — ดูสถานะได้ที่{" "}
            <a href="/orders" className="text-krachiao underline">ออเดอร์ของฉัน</a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="surface-card mt-3 space-y-4 p-4">
            {menuItems.length > 0 && (
              <div>
                <label className="field-label">เลือกจากเมนู</label>
                <select
                  value={selectedMenuId}
                  onChange={(e) => handleSelectMenu(e.target.value)}
                  className="field"
                >
                  <option value="custom">พิมพ์เอง / รายการอื่น</option>
                  {menuItems.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.item_name} {m.reference_price ? `(~${m.reference_price} บาท)` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="field-label">สินค้าที่ต้องการ</label>
              <input
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                placeholder="เช่น ชานมไข่มุก ไซส์ M หวานน้อย"
                className="field"
              />
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="field-label">จำนวน</label>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="field"
                />
              </div>
              <div className="flex-1">
                <label className="field-label">ราคาสินค้าโดยประมาณ (บาท)</label>
                <input
                  type="number"
                  min={0}
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  placeholder="ไม่บังคับ"
                  className="field"
                />
              </div>
            </div>

            <div>
              <label className="field-label">หมายเหตุถึงคนหิ้ว</label>
              <textarea
                value={buyerNote}
                onChange={(e) => setBuyerNote(e.target.value)}
                rows={2}
                className="field"
              />
            </div>

            {/* สรุปยอดรวม — คำนวณสดจากราคาสินค้า x จำนวน + ค่าหิ้ว */}
            <div className="ticket-card space-y-1.5 p-4 text-sm">
              <div className="flex items-center justify-between text-ink/60">
                <span>ค่าสินค้า{priceBreakdown.hasKnownItemPrice ? "" : " (ยังไม่ระบุราคา)"}</span>
                <span>{priceBreakdown.itemsSubtotal.toFixed(0)} บาท</span>
              </div>
              <div className="flex items-center justify-between text-ink/60">
                <span>
                  ค่าหิ้ว{" "}
                  {trip.fee_type === "per_item" ? `(${trip.service_fee.toFixed(0)} × ${Math.max(1, quantity || 1)})` : ""}
                </span>
                <span>{priceBreakdown.fee.toFixed(0)} บาท</span>
              </div>
              <div className="flex items-center justify-between border-t border-dashed border-ink/15 pt-1.5 font-display text-base text-ink">
                <span>ยอดรวมทั้งหมด</span>
                <span className="text-krachiao">{priceBreakdown.total.toFixed(0)} บาท</span>
              </div>
              {!priceBreakdown.hasKnownItemPrice && (
                <p className="pt-0.5 text-xs text-ink/40">
                  * ยอดสุดท้ายอาจเปลี่ยนตามราคาจริงที่ร้าน คนหิ้วจะแจ้งราคาที่แน่นอนอีกครั้ง
                </p>
              )}
            </div>

            {/* เลือกวิธีชำระเงิน */}
            <div>
              <label className="field-label">วิธีชำระเงิน</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("pay_on_delivery")}
                  className={`focus-ring rounded-xl border p-3 text-left text-sm transition-colors ${
                    paymentMethod === "pay_on_delivery"
                      ? "border-krachiao bg-krachiao/5 text-ink"
                      : "border-ink/15 text-ink/60 hover:bg-ink/5"
                  }`}
                >
                  <span className="block font-medium">จ่ายตอนรับของ</span>
                  <span className="block text-xs text-ink/45">นัดจ่ายเงินสดหรือโอนตอนรับของ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("pay_now")}
                  className={`focus-ring rounded-xl border p-3 text-left text-sm transition-colors ${
                    paymentMethod === "pay_now"
                      ? "border-krachiao bg-krachiao/5 text-ink"
                      : "border-ink/15 text-ink/60 hover:bg-ink/5"
                  }`}
                >
                  <span className="block font-medium">จ่ายเลย</span>
                  <span className="block text-xs text-ink/45">โอนผ่านพร้อมเพย์ทันที</span>
                </button>
              </div>

              {paymentMethod === "pay_now" && (
                <div className="mt-3 rounded-xl bg-cream p-4 text-center">
                  {carrierPromptPay ? (
                    <>
                      <p className="text-sm text-ink/70">สแกนเพื่อโอนให้คนหิ้ว</p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={promptPayQrUrl!}
                        alt={`พร้อมเพย์ QR ยอด ${priceBreakdown.total.toFixed(0)} บาท`}
                        className="mx-auto mt-2 h-44 w-44 rounded-lg bg-white p-2 shadow-sm"
                      />
                      <p className="mt-2 font-display text-lg text-krachiao">
                        {priceBreakdown.total.toFixed(0)} บาท
                      </p>
                      <p className="mt-1 text-xs text-ink/45">
                        พร้อมเพย์: {trip.profiles?.promptpay_id} · แคปหน้าจอสลิปเก็บไว้เป็นหลักฐาน
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-ink/60">
                      คนหิ้วยังไม่ได้ตั้งค่าพร้อมเพย์ กรุณาเลือก &quot;จ่ายตอนรับของ&quot; แทนไปก่อน
                    </p>
                  )}
                </div>
              )}
            </div>

            {formError && <p className="text-sm text-red-600">{formError}</p>}

            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting
                ? "กำลังส่งออเดอร์..."
                : !user
                ? "เข้าสู่ระบบเพื่อสั่งซื้อ"
                : `ยืนยันสั่งซื้อ · ${priceBreakdown.total.toFixed(0)} บาท`}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
