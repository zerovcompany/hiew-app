"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import type { CarrierTrip } from "@/lib/types";
import TripCard from "@/components/TripCard";
import EmptyState from "@/components/EmptyState";
import { SkeletonList } from "@/components/Skeleton";
import { IconSearch, IconChevronLeft, IconChevronRight } from "@/components/Icons";
import Link from "next/link";

const PAGE_SIZE = 10;

type PriceSort = "none" | "asc" | "desc";

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
  const [totalCount, setTotalCount] = useState(0);

  // ตัวกรอง — ค้นหาจากชื่อร้าน, กรองวันที่ส่ง, เรียงตามราคา
  const [nameQuery, setNameQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [priceSort, setPriceSort] = useState<PriceSort>("none");
  const [page, setPage] = useState(1);

  // debounce ช่องค้นหาชื่อร้าน กันยิง query ถี่เกินไปตอนพิมพ์
  const [debouncedNameQuery, setDebouncedNameQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedNameQuery(nameQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [nameQuery]);

  // เปลี่ยนตัวกรองใด ๆ ให้กลับไปหน้า 1 เสมอ กันเคสค้างอยู่หน้าที่ไม่มีข้อมูลแล้ว
  useEffect(() => {
    setPage(1);
  }, [debouncedNameQuery, dateFilter, priceSort, shopId]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let req = supabase
        .from("carrier_trips")
        .select("*, profiles(display_name, rating_avg), shops(name)", { count: "exact" })
        .eq("status", "open")
        .gte("order_cutoff_at", new Date().toISOString());

      if (shopId) req = req.eq("shop_id", shopId);
      if (debouncedNameQuery) req = req.ilike("shop_name_text", `%${debouncedNameQuery}%`);
      if (dateFilter) req = req.eq("delivery_date", dateFilter);

      // เรียงลำดับ: ถ้าเลือกเรียงราคาไว้ ให้เรียงตามราคาก่อน ไม่งั้นเรียงตามวันที่ส่งใกล้สุดก่อน
      if (priceSort === "asc") {
        req = req.order("service_fee", { ascending: true });
      } else if (priceSort === "desc") {
        req = req.order("service_fee", { ascending: false });
      } else {
        req = req.order("delivery_date", { ascending: true });
      }
      req = req.range(from, to);

      const { data, error, count } = await req;
      if (!error && data) setTrips(data as unknown as CarrierTrip[]);
      setTotalCount(count ?? 0);

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
  }, [shopId, debouncedNameQuery, dateFilter, priceSort, page]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const hasFilters = !!(nameQuery || dateFilter || priceSort !== "none");

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

      {/* แถบตัวกรอง — ค้นหาชื่อร้าน, กรองวันที่ส่ง, เรียงราคา */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-ink/15 bg-white px-3 py-2 sm:min-w-[220px]">
          <IconSearch className="h-4 w-4 shrink-0 text-ink/40" />
          <input
            value={nameQuery}
            onChange={(e) => setNameQuery(e.target.value)}
            placeholder="ค้นหาจากชื่อร้าน..."
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink/40"
          />
        </div>

        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="field w-auto text-sm sm:w-auto"
          aria-label="กรองวันที่ส่ง"
        />

        <select
          value={priceSort}
          onChange={(e) => setPriceSort(e.target.value as PriceSort)}
          className="field w-auto text-sm sm:w-auto"
          aria-label="เรียงตามราคา"
        >
          <option value="none">เรียงตาม: วันที่ส่งใกล้สุด</option>
          <option value="asc">ราคา: น้อยไปมาก</option>
          <option value="desc">ราคา: มากไปน้อย</option>
        </select>

        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setNameQuery("");
              setDateFilter("");
              setPriceSort("none");
            }}
            className="text-sm text-krachiao underline"
          >
            ล้างตัวกรอง
          </button>
        )}
      </div>

      {loading ? (
        <SkeletonList />
      ) : trips.length === 0 ? (
        <EmptyState
          title={
            hasFilters
              ? "ไม่พบเที่ยวหิ้วที่ตรงกับตัวกรองนี้ ลองปรับตัวกรองดูใหม่"
              : "ตอนนี้ยังไม่มีเที่ยวหิ้วที่เปิดรับอยู่ ลองกลับมาดูใหม่ภายหลัง"
          }
        />
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {trips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>

          {/* แบ่งหน้า — โชว์ทีละ 10 เที่ยว */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="focus-ring inline-flex items-center gap-1 rounded-full border border-ink/15 px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <IconChevronLeft className="h-4 w-4" /> ก่อนหน้า
              </button>
              <span className="text-sm text-ink/60">
                หน้า {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="focus-ring inline-flex items-center gap-1 rounded-full border border-ink/15 px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ถัดไป <IconChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
