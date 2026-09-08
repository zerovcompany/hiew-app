"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { PromoBanner } from "@/lib/types";
import { IconChevronLeft, IconChevronRight } from "@/components/Icons";

const AUTOPLAY_MS = 5000;

export default function BannerCarousel({ banners }: { banners: PromoBanner[] }) {
  const [index, setIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const count = banners.length;

  const goTo = useCallback((i: number) => {
    if (count === 0) return;
    setIndex(((i % count) + count) % count);
  }, [count]);

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  // เลื่อนสไลด์อัตโนมัติ — พักเวลาไว้ที่ AUTOPLAY_MS แล้ว reset ทุกครั้งที่ index เปลี่ยน (รวมตอนคนกดเอง)
  useEffect(() => {
    if (count <= 1) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [count, index]);

  // รองรับปัดนิ้วซ้าย/ขวาบนมือถือ
  const touchStartX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) (dx > 0 ? prev() : next());
    touchStartX.current = null;
  };

  if (count === 0) return null;

  return (
    <div
      className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-mudmee sm:aspect-[21/9]"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {banners.map((banner, i) => {
        const slide = (
          <Image
            src={banner.image_url}
            alt="โฆษณา"
            fill
            priority={i === 0}
            sizes="(max-width: 640px) 100vw, 1024px"
            className="object-cover"
          />
        );
        return (
          <div
            key={banner.id}
            className={`absolute inset-0 transition-opacity duration-500 ${i === index ? "opacity-100" : "pointer-events-none opacity-0"}`}
          >
            {banner.link_url ? (
              banner.link_url.startsWith("http") ? (
                <a href={banner.link_url} target="_blank" rel="noreferrer" className="block h-full w-full">
                  {slide}
                </a>
              ) : (
                <Link href={banner.link_url} className="block h-full w-full">
                  {slide}
                </Link>
              )
            ) : (
              slide
            )}
          </div>
        );
      })}

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="สไลด์ก่อนหน้า"
            className="focus-ring absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white hover:bg-black/45"
          >
            <IconChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="สไลด์ถัดไป"
            className="focus-ring absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white hover:bg-black/45"
          >
            <IconChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute bottom-2.5 left-1/2 flex -translate-x-1/2 gap-1.5">
            {banners.map((b, i) => (
              <button
                key={b.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`ไปสไลด์ที่ ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-white" : "w-1.5 bg-white/50"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
