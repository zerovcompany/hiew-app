"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";
import type { CarrierTrip, Order, PaymentMethod, TripMenuItem } from "@/lib/types";
import type { User } from "@supabase/supabase-js";
import { SkeletonCard } from "@/components/Skeleton";
import StatusBadge from "@/components/StatusBadge";
import { IconTrash, IconPaperclip } from "@/components/Icons";
import type { BuyerAddress } from "@/lib/types";

type SellOrderRow = Order & { profiles?: { display_name: string; phone: string | null } };

const paymentLabelMap: Record<string, string> = {
  pay_now: "จ่ายผ่านพร้อมเพย์แล้ว",
  pay_on_delivery: "จ่ายตอนรับของ",
};

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
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<BuyerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");

  // แนบสลิปทันทีหลังสั่งซื้อ (กรณีเลือก "จ่ายเลย") — ไม่งั้นคนหิ้วเช็คเงินไม่ได้
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipUploading, setSlipUploading] = useState(false);
  const [slipUploaded, setSlipUploaded] = useState(false);
  const [slipError, setSlipError] = useState<string | null>(null);

  // ฝั่งคนหิ้ว (เจ้าของเที่ยว) — ดูว่าใครสั่งเข้ามาบ้าง และลบเที่ยวนี้ได้
  const [sellOrders, setSellOrders] = useState<SellOrderRow[]>([]);
  const [sellOrdersLoading, setSellOrdersLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUser = sessionData.session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        const { data: addressRows } = await supabase.from("buyer_addresses").select("*").eq("profile_id", currentUser.id).order("is_default", { ascending: false }).order("created_at", { ascending: false });
        const rows = (addressRows as BuyerAddress[]) ?? []; setAddresses(rows); setSelectedAddressId(rows.find((a) => a.is_default)?.id ?? rows[0]?.id ?? "");
      }

      const { data: tripData } = await supabase
        .from("carrier_trips")
        .select("*, profiles(display_name, rating_avg, rating_count, avatar_url, promptpay_id), shops(name)")
        .eq("id", id)
        .maybeSingle();
      const loadedTrip = tripData as unknown as CarrierTrip;
      setTrip(loadedTrip);

      const { data: items } = await supabase
        .from("trip_menu_items")
        .select("*")
        .eq("trip_id", id);
      setMenuItems((items as TripMenuItem[]) ?? []);
      setLoading(false);

      // ถ้าเป็นเจ้าของเที่ยวหิ้วนี้ ให้โหลดรายการออเดอร์ที่มีคนสั่งเข้ามาด้วย
      console.log("[hiew] trip loaded:", loadedTrip?.id, "carrier_id:", loadedTrip?.carrier_id, "currentUser:", currentUser?.id);
      if (loadedTrip && currentUser && loadedTrip.carrier_id === currentUser.id) {
        setSellOrdersLoading(true);
        const { data: orders, error: sellOrdersError } = await supabase
          .from("orders")
          .select("*, profiles!orders_buyer_id_fkey(display_name, phone)")
          .eq("trip_id", id)
          .order("created_at", { ascending: false });
        if (sellOrdersError) {
          console.error("[hiew] sellOrders query error (มักเกิดจาก RLS ไม่อนุญาต):", sellOrdersError);
        }
        console.log("[hiew] sellOrders rows:", orders?.length ?? 0, orders);
        setSellOrders((orders as unknown as SellOrderRow[]) ?? []);
        setSellOrdersLoading(false);
      }
    };
    load();
  }, [id]);

  const isOwner = !!(user && trip && trip.carrier_id === user.id);

  const handleDeleteTrip = async () => {
    if (!trip) return;
    const hasOrders = sellOrders.length > 0;
    const confirmMsg = hasOrders
      ? `เที่ยวนี้มีออเดอร์เข้ามาแล้ว ${sellOrders.length} รายการ ถ้าลบ ออเดอร์ทั้งหมดจะถูกลบไปด้วย ต้องการลบจริงหรือไม่?`
      : "ต้องการลบเที่ยวหิ้วนี้ใช่หรือไม่? ลบแล้วกู้คืนไม่ได้";
    if (!window.confirm(confirmMsg)) return;

    setDeleting(true);
    setDeleteError(null);
    const { error } = await supabase.from("carrier_trips").delete().eq("id", trip.id);
    setDeleting(false);
    if (error) {
      setDeleteError("ลบเที่ยวหิ้วไม่สำเร็จ ลองใหม่อีกครั้ง");
      console.error(error);
      return;
    }
    router.push("/orders?tab=selling");
  };

  const handleUploadSlip = async () => {
    if (!slipFile || !createdOrderId) return;
    setSlipUploading(true);
    setSlipError(null);
    const ext = slipFile.name.split(".").pop() ?? "jpg";
    const path = `${createdOrderId}/slip-${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from("payment-slips").upload(path, slipFile);
    if (uploadErr) {
      setSlipError("แนบสลิปไม่สำเร็จ ลองใหม่อีกครั้ง");
      setSlipUploading(false);
      console.error(uploadErr);
      return;
    }
    const { error: updateErr } = await supabase
      .from("orders")
      .update({ payment_slip_url: path })
      .eq("id", createdOrderId);
    setSlipUploading(false);
    if (updateErr) {
      setSlipError("บันทึกสลิปไม่สำเร็จ ลองใหม่อีกครั้ง");
      console.error(updateErr);
      return;
    }
    setSlipUploaded(true);
  };

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
    if (!itemDescription.trim()) { setFormError("กรุณาระบุสินค้าที่ต้องการสั่ง"); return; }
    const selectedAddress = addresses.find((a) => a.id === selectedAddressId);
    if (!selectedAddress) { setFormError("กรุณาเพิ่มและเลือกที่อยู่จัดส่งก่อนสั่งออเดอร์"); return; }
    if (paymentMethod === "pay_now" && !carrierPromptPay) {
      setFormError("คนหิ้วยังไม่ได้ตั้งค่าพร้อมเพย์ กรุณาเลือก \"จ่ายตอนรับของ\" แทน");
      return;
    }

    setSubmitting(true);

    // ดึง carrier + fee ก่อนแล้วค่อยสร้าง order
    const { data: tripData, error: tripError } = await supabase
      .from("carrier_trips")
      .select("carrier_id, service_fee")
      .eq("id", trip.id)
      .single();

    if (tripError || !tripData) {
      console.error("trip error:", tripError);
      setFormError("โหลดข้อมูลทริปไม่สำเร็จ ลองใหม่อีกครั้ง");
      setSubmitting(false);
      return;
    }

    const { data: newOrder, error } = await supabase
      .from("orders")
      .insert({
        trip_id: trip.id,
        buyer_id: user.id,
        carrier_id: tripData.carrier_id,
        menu_item_id: selectedMenuId !== "custom" ? selectedMenuId : null,
        service_fee_snapshot: tripData.service_fee,
        item_description: itemDescription,
        quantity,
        item_price: itemPrice ? Number(itemPrice) : null,
        buyer_note: buyerNote.trim() ? buyerNote.trim() : null,
        payment_method: paymentMethod,
        delivery_name: selectedAddress.recipient_name,
        delivery_phone: selectedAddress.phone,
        delivery_address: selectedAddress.address_text,
        delivery_province: selectedAddress.province,
        delivery_district: selectedAddress.district,
        delivery_subdistrict: selectedAddress.subdistrict,
        delivery_postal_code: selectedAddress.postal_code,
        delivery_latitude: selectedAddress.latitude,
        delivery_longitude: selectedAddress.longitude,
      })
      .select()
      .single();

    setSubmitting(false);

    if (error || !newOrder) {
      setFormError("สั่งซื้อไม่สำเร็จ ลองใหม่อีกครั้ง");
      console.error(error);
    } else {
      setCreatedOrderId(newOrder.id);
      setSubmitted(true);
      const session = await supabase.auth.getSession();
      fetch("/api/notifications/order", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.data.session?.access_token ?? ""}` }, body: JSON.stringify({ order_id: newOrder.id, event: "created" }) }).catch(() => undefined);
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
      {trip.cover_image_url && (
        <div className="relative -mt-2 mb-4 h-44 w-full overflow-hidden rounded-2xl">
          <Image src={trip.cover_image_url} alt={trip.shop_name_text} fill className="object-cover" />
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-mudmee">{trip.shop_name_text}</p>
          <h1 className="mt-1 font-display text-2xl text-ink">
            ส่ง {new Date(trip.delivery_date).toLocaleDateString("th-TH", { day: "numeric", month: "long" })}
            {" "}เวลา {trip.delivery_time_start.slice(0, 5)}-{trip.delivery_time_end.slice(0, 5)} น.
          </h1>
        </div>
        {isOwner && (
          <button
            onClick={handleDeleteTrip}
            disabled={deleting}
            aria-label="ลบเที่ยวหิ้วนี้"
            className="focus-ring flex shrink-0 items-center gap-1.5 rounded-full border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            <IconTrash className="h-4 w-4" />
            {deleting ? "กำลังลบ..." : "ลบเที่ยวนี้"}
          </button>
        )}
      </div>
      {deleteError && <p className="mt-2 text-sm text-red-600">{deleteError}</p>}

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

      {!isOwner && !isClosed && (
        <section className="mt-5 ticket-card p-4">
          <div className="flex items-center justify-between"><h2 className="font-display text-base text-ink">ที่อยู่จัดส่ง</h2><Link href="/profile" className="text-xs text-krachiao underline">จัดการที่อยู่</Link></div>
          {addresses.length === 0 ? <p className="mt-2 rounded-xl bg-turmeric-light p-3 text-sm text-ink/70">ยังไม่มีที่อยู่ที่บันทึกไว้ กรุณาเพิ่มที่อยู่ในโปรไฟล์ก่อนสั่งออเดอร์</p> : <div className="mt-3 space-y-2">{addresses.map((a) => <label key={a.id} className={`block cursor-pointer rounded-xl border p-3 ${selectedAddressId === a.id ? "border-krachiao bg-krachiao/5" : "border-ink/10"}`}><div className="flex gap-2"><input type="radio" name="delivery-address" checked={selectedAddressId === a.id} onChange={() => setSelectedAddressId(a.id)} className="mt-1 accent-krachiao"/><div><p className="text-sm font-medium">{a.label} {a.is_default && <span className="text-xs text-krachiao">(เริ่มต้น)</span>}</p><p className="mt-0.5 text-xs text-ink/60">{a.recipient_name} · {a.phone}</p><p className="mt-1 text-xs text-ink/60">{a.address_text}</p>{a.latitude != null && a.longitude != null && <a href={`https://www.google.com/maps?q=${a.latitude},${a.longitude}`} target="_blank" rel="noreferrer" onClick={(e)=>e.stopPropagation()} className="mt-1 inline-block text-xs text-krachiao underline">ดูตำแหน่งบนแผนที่</a>}</div></div></label>)}</div>}
        </section>
      )}

      {isOwner ? (
        <section className="mt-8">
          <h2 className="font-display text-lg text-ink">
            ออเดอร์ที่สั่งเข้ามา {sellOrders.length > 0 && `(${sellOrders.length})`}
          </h2>

          {sellOrdersLoading ? (
            <div className="mt-3"><SkeletonCard /></div>
          ) : sellOrders.length === 0 ? (
            <p className="mt-3 rounded-xl bg-ink/5 p-4 text-sm text-ink/60">ยังไม่มีใครสั่งเข้ามาในเที่ยวนี้</p>
          ) : (
            <div className="mt-3 space-y-3">
              {sellOrders.map((o) => (
                <Link
                  key={o.id}
                  href={`/orders/${o.id}`}
                  className="focus-ring ticket-card block p-4 hover:shadow-card"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-ink">{o.profiles?.display_name ?? "ผู้ซื้อ"}</p>
                      <p className="mt-0.5 text-sm text-ink/70">{o.item_description} × {o.quantity}</p>
                      {o.buyer_note && <p className="mt-0.5 text-xs text-ink/45">{o.buyer_note}</p>}
                      {o.created_at && (
                        <p className="mt-1 text-xs text-ink/40">
                          สั่งเมื่อ {new Date(o.created_at).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} น.
                        </p>
                      )}
                    </div>
                    <StatusBadge status={o.status} />
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-dashed border-ink/15 pt-2 text-sm">
                    <span className="flex items-center gap-1 text-ink/50">
                      {paymentLabelMap[o.payment_method] ?? "จ่ายตอนรับของ"}
                      {o.payment_slip_url && (
                        <span className="flex items-center gap-0.5 text-krachiao">
                          <IconPaperclip className="h-3.5 w-3.5" /> มีสลิป
                        </span>
                      )}
                    </span>
                    <span className="font-medium text-ink/70">รวม {o.total_price} บาท</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      ) : (
      <section className="mt-8">
        <h2 className="font-display text-lg text-ink">สั่งซื้อ</h2>

        {isClosed ? (
          <p className="mt-3 rounded-xl bg-ink/5 p-4 text-sm text-ink/60">เที่ยวนี้ปิดรับออเดอร์แล้ว</p>
        ) : submitted ? (
          <div className="mt-3 ticket-card space-y-3 p-4 text-sm text-ink">
            <p>
              สั่งซื้อเรียบร้อย รอคนหิ้วยืนยันออเดอร์ — ดูรายละเอียดและสถานะได้ที่{" "}
              {createdOrderId ? (
                <Link href={`/orders/${createdOrderId}`} className="text-krachiao underline">ออเดอร์นี้</Link>
              ) : (
                <a href="/orders" className="text-krachiao underline">ออเดอร์ของฉัน</a>
              )}
            </p>

            {paymentMethod === "pay_now" && (
              <div className="border-t border-dashed border-ink/15 pt-3">
                {slipUploaded ? (
                  <p className="text-emerald-700">✓ แนบสลิปแล้ว คนหิ้วเช็คได้เลย</p>
                ) : (
                  <>
                    <p className="text-xs text-ink/50">แนบสลิปโอนเงินไว้ให้คนหิ้วเช็ค (ถ้ายังไม่ได้แนบ)</p>
                    <label className="surface-card mt-2 flex cursor-pointer items-center gap-2 p-2.5 text-xs text-ink/60 hover:bg-ink/5">
                      <IconPaperclip className="h-4 w-4 shrink-0" />
                      <span className="truncate">{slipFile ? slipFile.name : "เลือกรูปสลิปโอนเงิน"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => setSlipFile(e.target.files?.[0] ?? null)}
                      />
                    </label>
                    {slipError && <p className="mt-1.5 text-xs text-red-600">{slipError}</p>}
                    <button
                      type="button"
                      onClick={handleUploadSlip}
                      disabled={!slipFile || slipUploading}
                      className="btn-secondary mt-2 w-full text-xs disabled:opacity-60"
                    >
                      {slipUploading ? "กำลังแนบสลิป..." : "แนบสลิป"}
                    </button>
                  </>
                )}
              </div>
            )}
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
      )}
    </main>
  );
}
