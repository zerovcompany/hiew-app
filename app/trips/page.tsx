"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import type { CarrierTrip } from "@/lib/types";
import TripCard from "@/components/TripCard";
import EmptyState from "@/components/EmptyState";
import { SkeletonList } from "@/components/Skeleton";
import Link from "next/link";

export default function TripsPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-5xl px-4 pb-16 pt-10"><SkeletonList /></main>}>
      <TripsPageInner />
    </Suspense>
  );
}

function TripsPageInner() {
  const searchParams = useSearchParams();
  const shopId = searchParams.get("shop");
  const [trips, setTrips] = useState<CarrierTrip[]>([]);
  const [shopName, setShopName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      let req = supabase
        .from("carrier_trips")
        .select("*, profiles(display_name, rating_avg), shops(name)")
        .eq("status", "open")
        .gte("order_cutoff_at", new Date().toISOString())
        .order("delivery_date", { ascending: true });

      if (shopId) req = req.eq("shop_id", shopId);

      const { data, error } = await req;
      if (!error && data) setTrips(data as unknown as CarrierTrip[]);

      if (shopId) {
        const { data: shop } = await supabase
          .from("shops")
          .select("name")
          .eq("id", shopId)
          .maybeSingle();
        setShopName(shop?.name ?? null);
      } else {
        setShopName(null);
      }

      setLoading(false);
    };
    load();
  }, [shopId]);

  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 pt-10">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink">
          {shopName ? `เที่ยวหิ้วร้าน "${shopName}"` : "เที่ยวหิ้วทั้งหมด"}
        </h1>
        {shopName && (
          <Link href="/trips" className="text-sm text-krachiao underline">
            ดูทุกร้าน
          </Link>
        )}
      </div>

      {loading ? (
        <SkeletonList />
      ) : trips.length === 0 ? (
        <EmptyState title="ตอนนี้ยังไม่มีเที่ยวหิ้วที่เปิดรับอยู่ ลองกลับมาดูใหม่ภายหลัง" />
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}
    </main>
  );
}
