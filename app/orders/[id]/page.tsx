"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import type { CarrierTrip, Order, OrderStatus, Profile } from "@/lib/types";
import type { User } from "@supabase/supabase-js";
import StatusBadge from "@/components/StatusBadge";
import { SkeletonCard } from "@/components/Skeleton";
import { IconArrowLeft, IconPaperclip } from "@/components/Icons";

const nextStatus: Record<string, OrderStatus | null> = {
  pending: "confirmed",
  confirmed: "purchased",
  purchased: "delivered",
  delivered: null,
  cancelled: null,
};

const actionLabel: Record<string, string> = {
  pending: "รับออเดอร์นี้",
  confirmed: "ทำเครื่องหมายว่าซื้อแล้ว",
  purchased: "ทำเครื่องหมายว่าส่งแล้ว",
};

const paymentLabel: Record<string, string> = {
  pay_now: "จ่ายผ่านพร้อมเพย์แล้ว",
  pay_on_delivery: "จ่ายตอนรับของ",
};

const statusSteps: OrderStatus[] = ["pending", "confirmed", "purchased", "delivered"];

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [trip, setTrip] = useState<CarrierTrip | null>(null);
  const [buyerProfile, setBuyerProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  const [slipSignedUrl, setSlipSignedUrl] = useState<string | null>(null);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipUploading, setSlipUploading] = useState(false);
  const [slipError, setSlipError] = useState<string | null>(null);

  const [advancing, setAdvancing] = useState(false);

  const loadSlipSignedUrl = async (path: string) => {
    const { data } = await supabase.storage.from("payment-slips").createSignedUrl(path, 3600);
    setSlipSignedUrl(data?.signedUrl ?? null);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUser = sessionData.session?.user ?? null;
      setUser(currentUser);

      if (!currentUser) {
        router.push("/login");
        return;
      }

      const { data: orderData } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
      if (!orderData) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const loadedOrder = orderData as Order;

      const { data: tripData } = await supabase
        .from("carrier_trips")
        .select("*, profiles(display_name, phone, promptpay_id, rating_avg, rating_count)")
        .eq("id", loadedOrder.trip_id)
        .maybeSingle();
      const loadedTrip = tripData as unknown as CarrierTrip;

      const isBuyer = currentUser.id === loadedOrder.buyer_id;
      const isCarrier = loadedTrip && currentUser.id === loadedTrip.carrier_id;

      if (!isBuyer && !isCarrier) {
        setForbidden(true);
        setLoading(false);
        return;
      }

      const { data: buyerData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", loadedOrder.buyer_id)
        .maybeSingle();

      setOrder(loadedOrder);
      setTrip(loadedTrip);
      setBuyerProfile(buyerData as Profile);
      setLoading(false);

      if (loadedOrder.payment_slip_url) {
        loadSlipSignedUrl(loadedOrder.payment_slip_url);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const isBuyer = !!(user && order && user.id === order.buyer_id);
  const isCarrier = !!(user && trip && user.id === trip.carrier_id);

  const handleUploadSlip = async () => {
    if (!slipFile || !order) return;
    setSlipUploading(true);
    setSlipError(null);
    const ext = slipFile.name.split(".").pop() ?? "jpg";
    const path = `${order.id}/slip-${Date.now()}.${ext}`;
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
      .eq("id", order.id);
    setSlipUploading(false);
    if (updateErr) {
      setSlipError("บันทึกสลิปไม่สำเร็จ ลองใหม่อีกครั้ง");
      console.error(updateErr);
      return;
    }
    setOrder({ ...order, payment_slip_url: path });
    setSlipFile(null);
    loadSlipSignedUrl(path);
  };

  const handleAdvance = async () => {
    if (!order) return;
    const next = nextStatus[order.status];
    if (!next) return;
    setAdvancing(true);
    const { error } = await supabase.from("orders").update({ status: next }).eq("id", order.id);
    setAdvancing(false);
    if (!error) setOrder({ ...order, status: next });
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-10">
        <div className="skeleton h-3 w-24 animate-shimmer" />
        <div className="mt-4"><SkeletonCard /></div>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center text-ink/60">
        ไม่พบออเดอร์นี้ อาจถูกลบไปแล้ว
      </main>
    );
  }

  if (forbidden) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center text-ink/60">
        คุณไม่มีสิทธิ์ดูออเดอร์นี้
      </main>
    );
  }

  if (!order || !trip) return null;

  const isCancelled = order.status === "cancelled";
  const currentStepIndex = statusSteps.indexOf(order.status);

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-10">
      <Link href="/orders" className="focus-ring flex items-center gap-1.5 text-sm text-ink/50 hover:text-krachiao">
        <IconArrowLeft className="h-4 w-4" /> กลับไปหน้าออเดอร์
      </Link>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-mudmee">{trip.shop_name_text}</p>
          <h1 className="mt-1 font-display text-2xl text-ink">
            {order.item_description} × {order.quantity}
          </h1>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* สถานะออเดอร์ */}
      {!isCancelled && (
        <div className="mt-5 ticket-card p-4">
          <div className="flex items-center justify-between">
            {statusSteps.map((step, i) => (
              <div key={step} className="flex flex-1 flex-col items-center gap-1.5 text-center">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                    i <= currentStepIndex ? "bg-krachiao text-white" : "bg-ink/10 text-ink/40"
                  }`}
                >
                  {i + 1}
                </span>
                <span className={`text-[11px] ${i <= currentStepIndex ? "text-ink" : "text-ink/40"}`}>
                  {
                    (
                      { pending: "รอรับ", confirmed: "รับแล้ว", purchased: "ซื้อแล้ว", delivered: "ส่งแล้ว" } as Record<
                        string,
                        string
                      >
                    )[step]
                  }
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* รายละเอียดเที่ยว */}
      <div className="mt-4 ticket-card p-4">
        <dl className="grid grid-cols-2 gap-y-2.5 text-sm">
          {isBuyer && (
            <>
              <dt className="text-ink/50">คนหิ้ว</dt>
              <dd className="text-right font-medium">{trip.profiles?.display_name}</dd>
            </>
          )}
          {isCarrier && buyerProfile && (
            <>
              <dt className="text-ink/50">ผู้ซื้อ</dt>
              <dd className="text-right font-medium">{buyerProfile.display_name}</dd>
              {buyerProfile.phone && (
                <>
                  <dt className="text-ink/50">เบอร์ติดต่อ</dt>
                  <dd className="text-right font-medium">{buyerProfile.phone}</dd>
                </>
              )}
            </>
          )}
          <dt className="text-ink/50">จุดนัดรับ</dt>
          <dd className="text-right font-medium">{trip.delivery_location}</dd>
          <dt className="text-ink/50">วันส่งของ</dt>
          <dd className="text-right font-medium">
            {new Date(trip.delivery_date).toLocaleDateString("th-TH", { day: "numeric", month: "long" })}
            {" "}เวลา {trip.delivery_time_start.slice(0, 5)}-{trip.delivery_time_end.slice(0, 5)} น.
          </dd>
        </dl>
        {order.buyer_note && (
          <p className="mt-3 border-t border-dashed border-ink/15 pt-3 text-sm text-ink/70">
            หมายเหตุจากผู้ซื้อ: {order.buyer_note}
          </p>
        )}
      </div>

      {/* สรุปยอด */}
      <div className="mt-4 ticket-card space-y-1.5 p-4 text-sm">
        <div className="flex items-center justify-between text-ink/60">
          <span>ค่าสินค้า{order.item_price == null ? " (ยังไม่ระบุราคา)" : ""}</span>
          <span>{((order.item_price ?? 0) * order.quantity).toFixed(0)} บาท</span>
        </div>
        <div className="flex items-center justify-between text-ink/60">
          <span>ค่าหิ้ว</span>
          <span>{order.service_fee_snapshot.toFixed(0)} บาท</span>
        </div>
        <div className="flex items-center justify-between border-t border-dashed border-ink/15 pt-1.5 font-display text-base text-ink">
          <span>ยอดรวมทั้งหมด</span>
          <span className="text-krachiao">{order.total_price.toFixed(0)} บาท</span>
        </div>
        <div className="flex items-center justify-between pt-1 text-xs text-ink/45">
          <span>วิธีชำระเงิน</span>
          <span>{paymentLabel[order.payment_method] ?? "จ่ายตอนรับของ"}</span>
        </div>
      </div>

      {/* สลิปโอนเงิน */}
      {order.payment_method === "pay_now" && (
        <div className="mt-4 ticket-card p-4">
          <h2 className="flex items-center gap-1.5 font-display text-base text-ink">
            <IconPaperclip className="h-4 w-4" /> สลิปโอนเงิน
          </h2>

          {slipSignedUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={slipSignedUrl} alt="สลิปโอนเงิน" className="mt-3 max-h-96 w-full rounded-xl object-contain" />
          ) : (
            <p className="mt-2 text-sm text-ink/50">ยังไม่มีการแนบสลิป</p>
          )}

          {isBuyer && (
            <div className="mt-3 border-t border-dashed border-ink/15 pt-3">
              <label className="surface-card flex cursor-pointer items-center gap-2 p-2.5 text-xs text-ink/60 hover:bg-ink/5">
                <IconPaperclip className="h-4 w-4 shrink-0" />
                <span className="truncate">{slipFile ? slipFile.name : "เลือกรูปสลิปใหม่"}</span>
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
                {slipUploading ? "กำลังแนบสลิป..." : slipSignedUrl ? "แนบสลิปใหม่" : "แนบสลิป"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ปุ่มจัดการสถานะ (เฉพาะคนหิ้ว) */}
      {isCarrier && nextStatus[order.status] && (
        <button
          type="button"
          onClick={handleAdvance}
          disabled={advancing}
          className="btn-primary mt-5 w-full disabled:opacity-60"
        >
          {advancing ? "กำลังอัปเดต..." : actionLabel[order.status]}
        </button>
      )}
    </main>
  );
}
