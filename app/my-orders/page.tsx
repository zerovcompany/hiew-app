"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import { SkeletonList } from "@/components/Skeleton";

type OrderRow = {
  id: string;
  item_description: string;
  quantity: number;
  total_price: number;
  status: string;
  trip_id: string;
  carrier_trips: { shop_name_text: string; delivery_date: string } | null;
};

export default function MyOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user.id;
      if (!uid) {
        router.push("/login");
        return;
      }
      const { data } = await supabase
        .from("orders")
        .select("*, carrier_trips(shop_name_text, delivery_date)")
        .eq("buyer_id", uid)
        .order("created_at", { ascending: false });
      setOrders((data as unknown as OrderRow[]) ?? []);
      setLoading(false);
    };
    load();
  }, [router]);

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-10">
      <h1 className="font-display text-2xl text-ink">ออเดอร์ของฉัน</h1>

      {loading ? (
        <SkeletonList count={3} />
      ) : orders.length === 0 ? (
        <EmptyState
          title="ยังไม่มีออเดอร์"
          action={<Link href="/" className="btn-primary text-sm">เริ่มค้นหาร้าน</Link>}
        />
      ) : (
        <div className="mt-4 space-y-3">
          {orders.map((o) => (
            <Link key={o.id} href={`/trips/${o.trip_id}`} className="focus-ring ticket-card block p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-mudmee">{o.carrier_trips?.shop_name_text}</p>
                  <p className="mt-0.5 font-medium text-ink">
                    {o.item_description} × {o.quantity}
                  </p>
                </div>
                <StatusBadge status={o.status} />
              </div>
              <p className="mt-2 text-sm text-ink/60">รวม {o.total_price} บาท</p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
