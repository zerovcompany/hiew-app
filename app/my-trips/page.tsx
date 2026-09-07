"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import type { CarrierTrip, Order, OrderStatus } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import { SkeletonList } from "@/components/Skeleton";
import { IconPlus } from "@/components/Icons";

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

export default function MyTripsPage() {
  const router = useRouter();
  const [trips, setTrips] = useState<CarrierTrip[]>([]);
  const [ordersByTrip, setOrdersByTrip] = useState<Record<string, Order[]>>({});
  const [loading, setLoading] = useState(true);

  const loadOrders = async (tripId: string) => {
    const { data } = await supabase.from("orders").select("*").eq("trip_id", tripId).order("created_at");
    setOrdersByTrip((prev) => ({ ...prev, [tripId]: (data as Order[]) ?? [] }));
  };

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user.id;
      if (!uid) {
        router.push("/login");
        return;
      }
      const { data } = await supabase
        .from("carrier_trips")
        .select("*")
        .eq("carrier_id", uid)
        .order("delivery_date", { ascending: false });
      const tripList = (data as CarrierTrip[]) ?? [];
      setTrips(tripList);
      await Promise.all(tripList.map((t) => loadOrders(t.id)));
      setLoading(false);
    };
    load();
  }, [router]);

  const advanceOrder = async (order: Order) => {
    const next = nextStatus[order.status];
    if (!next) return;
    await supabase.from("orders").update({ status: next }).eq("id", order.id);
    loadOrders(order.trip_id);
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-10">
        <SkeletonList count={2} />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-10">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink">เที่ยวหิ้วของฉัน</h1>
        <Link href="/trips/new" className="flex items-center gap-1 text-sm text-krachiao">
          <IconPlus className="h-4 w-4" /> เที่ยวใหม่
        </Link>
      </div>

      {trips.length === 0 ? (
        <EmptyState title="ยังไม่เคยเปิดรับหิ้ว" />
      ) : (
        <div className="mt-4 space-y-6">
          {trips.map((trip) => (
            <div key={trip.id} className="ticket-card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-mudmee">{trip.shop_name_text}</p>
                  <p className="font-medium text-ink">
                    ส่ง {new Date(trip.delivery_date).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <StatusBadge status={trip.status} />
              </div>

              <div className="mt-3 space-y-2 border-t border-dashed border-ink/15 pt-3">
                {(ordersByTrip[trip.id] ?? []).length === 0 ? (
                  <p className="text-sm text-ink/50">ยังไม่มีออเดอร์เข้ามา</p>
                ) : (
                  ordersByTrip[trip.id].map((o) => (
                    <div key={o.id} className="flex items-center justify-between rounded-xl bg-cream p-2.5 text-sm">
                      <div>
                        <p className="font-medium text-ink">{o.item_description} × {o.quantity}</p>
                        {o.buyer_note && <p className="text-xs text-ink/50">{o.buyer_note}</p>}
                      </div>
                      {nextStatus[o.status] ? (
                        <button
                          onClick={() => advanceOrder(o)}
                          className="focus-ring shrink-0 rounded-full bg-mudmee px-3 py-1.5 text-xs font-medium text-white hover:bg-mudmee-dark"
                        >
                          {actionLabel[o.status]}
                        </button>
                      ) : (
                        <StatusBadge status={o.status} />
                      )}
                    </div>
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
