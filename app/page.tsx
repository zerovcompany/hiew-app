"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import type { Shop } from "@/lib/types";
import ShopCard from "@/components/ShopCard";
import EmptyState from "@/components/EmptyState";
import { SkeletonGrid } from "@/components/Skeleton";
import { IconSearch, IconRoute, IconPlus } from "@/components/Icons";

// ถ้าร้านในระบบยังมีไม่เยอะ ให้โชว์ "ร้านทั้งหมด" ก่อน (เรียงร้านใหม่สุดก่อน)
// พอร้านเริ่มเยอะเกินเกณฑ์นี้ ค่อยสลับไปเรียงตาม "ยอดนิยม" (order_count) แทน
const ALL_SHOPS_THRESHOLD = 12;

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [showingAll, setShowingAll] = useState(true);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      const isBrowsing = !query.trim() && !category;

      // ตอนกำลัง "เดินดู" (ไม่ได้ค้นหา/กรอง) ต้องรู้ก่อนว่าร้านทั้งหมดมีกี่ร้าน
      // เพื่อเลือกว่าจะโชว์ "ร้านทั้งหมด" หรือสลับเป็น "ร้านยอดนิยม"
      let totalCount = 0;
      if (isBrowsing) {
        const { count } = await supabase
          .from("shops")
          .select("id", { count: "exact", head: true });
        totalCount = count ?? 0;
      }
      const willShowAll = isBrowsing && totalCount <= ALL_SHOPS_THRESHOLD;
      setShowingAll(willShowAll);

      let req = supabase.from("shops").select("*");

      if (willShowAll) {
        // ร้านยังไม่เยอะ: โชว์ทุกร้าน ใหม่สุดก่อน ไม่ต้องรอยอด order_count สะสม
        req = req.order("created_at", { ascending: false }).limit(48);
      } else {
        // ร้านเยอะแล้ว: เรียงตามความนิยม (จำนวนครั้งที่หิ้วสำเร็จ) แล้วจำกัดจำนวนที่โชว์
        req = req.order("order_count", { ascending: false }).limit(24);
      }

      if (query.trim()) req = req.ilike("name", `%${query.trim()}%`);
      if (category) req = req.eq("category", category);

      const { data, error } = await req;
      if (!error && data) setShops(data as Shop[]);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, category]);

  const categories = useMemo(() => {
    const set = new Set(shops.map((s) => s.category).filter(Boolean) as string[]);
    return Array.from(set);
  }, [shops]);

  return (
    <main className="pb-16">
      {/* Hero — ลายผ้ามัดหมี่บาง ๆ อ้างอิงอัตลักษณ์ชัยภูมิ */}
      <section className="ikat-band">
        <div className="mx-auto max-w-5xl px-4 pb-8 pt-10 sm:pb-10 sm:pt-14">
          <h1 className="max-w-lg font-display text-3xl font-semibold leading-tight text-white sm:text-4xl">
            อยากได้อะไร ให้คนชัยภูมิหิ้วมาให้
          </h1>
          <p className="mt-2 max-w-md text-white/75">
            ค้นหาร้านที่ต้องการ แล้วเลือกคนหิ้วที่ไปร้านนั้นได้เลย หรือเปิดรับหิ้วเองก็ทำได้
          </p>

          <div className="mt-6 flex items-center gap-2 rounded-2xl bg-paper p-2 shadow-lifted">
            <IconSearch className="ml-2 h-5 w-5 shrink-0 text-ink/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาร้าน เช่น ชานมไข่มุก, ตลาดโต้รุ่ง..."
              className="w-full bg-transparent py-2 text-ink outline-none placeholder:text-ink/40"
            />
          </div>

          <div className="mt-4 flex gap-3">
            <Link href="/trips" className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20">
              <IconRoute className="h-4 w-4" /> ดูเที่ยวหิ้วทั้งหมด
            </Link>
            <Link href="/trips/new" className="flex items-center gap-2 rounded-full bg-krachiao px-4 py-2 text-sm font-medium text-white hover:bg-krachiao-dark">
              <IconPlus className="h-4 w-4" /> เปิดรับหิ้ว
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4">
        {categories.length > 0 && (
          <div className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1">
            <button className="chip" data-active={category === null} onClick={() => setCategory(null)}>
              ทั้งหมด
            </button>
            {categories.map((c) => (
              <button key={c} className="chip" data-active={category === c} onClick={() => setCategory(c)}>
                {c}
              </button>
            ))}
          </div>
        )}

        <section className="mt-6">
          <h2 className="font-display text-xl text-ink">
            {query ? `ผลการค้นหา "${query}"` : showingAll ? "ร้านทั้งหมด" : "ร้านยอดนิยม"}
          </h2>

          {loading ? (
            <SkeletonGrid />
          ) : shops.length === 0 ? (
            <EmptyState
              ticket={false}
              title="ยังไม่มีร้านนี้ในระบบ — เป็นคนแรกที่เปิดรับหิ้วร้านนี้ไหม?"
              action={
                <Link href="/trips/new" className="btn-primary text-sm">
                  เปิดรับหิ้ว
                </Link>
              }
            />
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {shops.map((shop) => (
                <ShopCard key={shop.id} shop={shop} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
