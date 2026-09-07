"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import type { CarrierTrip, Order, OrderStatus, Profile } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import { SkeletonList } from "@/components/Skeleton";
import { IconPlus, IconPaperclip } from "@/components/Icons";

type OrderRow = Order & {
  carrier_trips: { shop_name_text: string; delivery_date: string } | null;
};

type SellOrderRow = Order & { profiles?: { display_name: string } };

const nextStatus: Record<string, OrderStatus | null> = {
  pending: "confirmed",
  confirmed: "purchased",
  purchased: "delivered",
  delivered: null,
  cancelled: null,
};

const actionLabel: Record<string, string> = {
  pending: "รับออเดอร์",
  confirmed: "ทำเครื่องหมายว่าซื้อแล้ว",
  purchased: "ทำเครื่องหมายว่าส่งแล้ว",
};

export default function OrdersHubPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-2xl px-4 pb-16 pt-10"><SkeletonList /></main>}>
      <OrdersHubInner />
    </Suspense>
  );
}

function OrdersHubInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "selling" ? "selling" : "buying";

  const [tab, setTab] = useState<"buying" | "selling">(initialTab);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [checking, setChecking] = useState(true);

  // แท็บ "ที่ฉันสั่ง" — ออเดอร์ที่กดสั่งซื้อไว้
  const [buyOrders, setBuyOrders] = useState<OrderRow[]>([]);
  const [buyLoading, setBuyLoading] = useState(true);

  // แท็บ "ที่ฉันหิ้ว" — เที่ยวหิ้วที่เปิดไว้ พร้อมออเดอร์ที่ลูกค้าสั่งเข้ามา
  const [trips, setTrips] = useState<CarrierTrip[]>([]);
  const [ordersByTrip, setOrdersByTrip] = useState<Record<string, SellOrderRow[]>>({});
  const [sellLoading, setSellLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user.id;
      if (!uid) {
        router.push("/login");
        return;
      }

      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
      setProfile(profileData as Profile);
      setChecking(false);

      const { data: orders } = await supabase
        .from("orders")
        .select("*, carrier_trips(shop_name_text, delivery_date)")
        .eq("buyer_id", uid)
        .order("created_at", { ascending: false });
      setBuyOrders((orders as unknown as OrderRow[]) ?? []);
      setBuyLoading(false);

      const { data: tripData } = await supabase
        .from("carrier_trips")
        .select("*")
        .eq("carrier_id", uid)
        .order("delivery_date", { ascending: false });
      const tripList = (tripData as CarrierTrip[]) ?? [];
      setTrips(tripList);
      await Promise.all(
        tripList.map(async (t) => {
          const { data } = await supabase
            .from("orders")
            .select("*, profiles(display_name)")
            .eq("trip_id", t.id)
            .order("created_at");
          setOrdersByTrip((prev) => ({ ...prev, [t.id]: (data as unknown as SellOrderRow[]) ?? [] }));
        })
      );
      setSellLoading(false);
    };
    load();
  }, [router]);

  const switchTab = (next: "buying" | "selling") => {
    setTab(next);
    router.replace(`/orders?tab=${next === "selling" ? "selling" : "buying"}`, { scroll: false });
  };

  const advanceOrder = async (order: Order) => {
    const next = nextStatus[order.status];
    if (!next) return;
    await supabase.from("orders").update({ status: next }).eq("id", order.id);
    const { data } = await supabase
      .from("orders")
      .select("*, profiles(display_name)")
      .eq("trip_id", order.trip_id)
      .order("created_at");
    setOrdersByTrip((prev) => ({ ...prev, [order.trip_id]: (data as unknown as SellOrderRow[]) ?? [] }));
  };

  const paymentLabel: Record<string, string> = {
    pay_now: "จ่ายผ่านพร้อมเพย์แล้ว",
    pay_on_delivery: "จ่ายตอนรับของ",
  };

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-10">
      <h1 className="font-display text-2xl text-ink">ออเดอร์</h1>
      <p className="mt-1 text-sm text-ink/60">ดูออเดอร์ที่คุณสั่ง หรือจัดการออเดอร์ของเที่ยวหิ้วที่คุณเปิดรับ</p>

      {/* แท็บเดียวจบ — กันความสับสนที่เคยมีเมนู "ออเดอร์" แยกกันหลายจุด */}
      <div className="mt-5 flex gap-1 rounded-full bg-ink/5 p-1">
        <button
          onClick={() => switchTab("buying")}
          className={`flex-1 rounded-full py-2 text-sm font-medium transition-colors ${
            tab === "buying" ? "bg-white text-krachiao shadow-sm" : "text-ink/50"
          }`}
        >
          ที่ฉันสั่ง
        </button>
        <button
          onClick={() => switchTab("selling")}
          className={`flex-1 rounded-full py-2 text-sm font-medium transition-colors ${
            tab === "selling" ? "bg-white text-krachiao shadow-sm" : "text-ink/50"
          }`}
        >
          ที่ฉันหิ้ว
        </button>
      </div>

      {checking ? (
        <div className="mt-4"><SkeletonList count={2} /></div>
      ) : tab === "buying" ? (
        buyLoading ? (
          <SkeletonList count={3} />
        ) : buyOrders.length === 0 ? (
          <EmptyState
            title="ยังไม่มีออเดอร์ที่สั่ง"
            action={<Link href="/" className="btn-primary text-sm">เริ่มค้นหาร้าน</Link>}
          />
        ) : (
          <div className="mt-4 space-y-3">
            {buyOrders.map((o) => (
              <Link key={o.id} href={`/orders/${o.id}`} className="focus-ring ticket-card block p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-mudmee">{o.carrier_trips?.shop_name_text}</p>
                    <p className="mt-0.5 font-medium text-ink">
                      {o.item_description} × {o.quantity}
                    </p>
                  </div>
                  <StatusBadge status={o.status} />
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-ink/50">{paymentLabel[o.payment_method] ?? "จ่ายตอนรับของ"}</span>
                  <span className="font-medium text-ink/70">รวม {o.total_price} บาท</span>
                </div>
              </Link>
            ))}
          </div>
        )
      ) : sellLoading ? (
        <SkeletonList count={2} />
      ) : !profile?.is_carrier ? (
        <EmptyState
          title="โหมดคนหิ้วยังไม่เปิดใช้งาน — เปิดในโปรไฟล์เพื่อเริ่มรับหิ้ว"
          action={<Link href="/profile" className="btn-primary text-sm">ไปที่โปรไฟล์</Link>}
        />
      ) : trips.length === 0 ? (
        <EmptyState
          title="ยังไม่เคยเปิดรับหิ้ว"
          action={<Link href="/trips/new" className="btn-primary text-sm">เปิดรับหิ้ว</Link>}
        />
      ) : (
        <div className="mt-4 space-y-6">
          <div className="flex justify-end">
            <Link href="/trips/new" className="flex items-center gap-1 text-sm text-krachiao">
              <IconPlus className="h-4 w-4" /> เที่ยวใหม่
            </Link>
          </div>
          {trips.map((trip) => (
            <div key={trip.id} className="ticket-card p-4">
              <div className="flex items-start justify-between">
                <Link href={`/trips/${trip.id}`} className="focus-ring hover:text-krachiao">
                  <p className="text-xs text-mudmee">{trip.shop_name_text}</p>
                  <p className="font-medium text-ink">
                    ส่ง {new Date(trip.delivery_date).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                  </p>
                </Link>
                <StatusBadge status={trip.status} />
              </div>

              <div className="mt-3 space-y-2 border-t border-dashed border-ink/15 pt-3">
                {(ordersByTrip[trip.id] ?? []).length === 0 ? (
                  <p className="text-sm text-ink/50">ยังไม่มีออเดอร์เข้ามา</p>
                ) : (
                  ordersByTrip[trip.id].map((o) => (
                    <Link
                      key={o.id}
                      href={`/orders/${o.id}`}
                      className="focus-ring block rounded-xl bg-cream p-2.5 text-sm hover:bg-cream/70"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          {o.profiles?.display_name && (
                            <p className="text-xs font-medium text-krachiao">{o.profiles.display_name}</p>
                          )}
                          <p className="font-medium text-ink">{o.item_description} × {o.quantity}</p>
                          {o.buyer_note && <p className="text-xs text-ink/50">{o.buyer_note}</p>}
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-ink/45">
                            {o.total_price} บาท · {paymentLabel[o.payment_method] ?? "จ่ายตอนรับของ"}
                            {o.payment_slip_url && (
                              <span className="flex items-center gap-0.5 text-krachiao">
                                <IconPaperclip className="h-3 w-3" /> มีสลิป
                              </span>
                            )}
                          </p>
                        </div>
                        {nextStatus[o.status] ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              advanceOrder(o);
                            }}
                            className="focus-ring shrink-0 rounded-full bg-mudmee px-3 py-1.5 text-xs font-medium text-white hover:bg-mudmee-dark"
                          >
                            {actionLabel[o.status]}
                          </button>
                        ) : (
                          <StatusBadge status={o.status} />
                        )}
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
