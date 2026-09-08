"use client";

import { useEffect, useRef, useState } from "react";
import type { CarrierTrip } from "@/lib/types";
import { IconShare, IconLink, IconX } from "./Icons";
import { useToast } from "@/lib/toast";

function formatThaiDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("th-TH", { day: "numeric", month: "long" });
}

// ปุ่มแชร์เที่ยวหิ้วลง social — ลิงก์ที่แชร์ออกไปพาไปหน้ารายละเอียดเที่ยวนี้ในแอปเสมอ
// (ต้องกดเข้าแอปเพื่อสั่งจริง) ตัวหน้าเพจเองมี Open Graph metadata (ดู generateMetadata
// ใน app/trips/[id]/page.tsx) ทำให้ตอนแปะลิงก์ใน LINE/Facebook ขึ้นการ์ดรายละเอียดโพสต์ให้อัตโนมัติ
export default function ShareTripButton({
  trip,
  className = "",
  label = "แชร์",
}: {
  trip: Pick<
    CarrierTrip,
    "id" | "shop_name_text" | "delivery_date" | "delivery_time_start" | "delivery_time_end" | "service_fee" | "delivery_location"
  >;
  className?: string;
  label?: string;
}) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setShareUrl(`${window.location.origin}/trips/${trip.id}`);
  }, [trip.id]);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const shareTitle = `รับหิ้ว ${trip.shop_name_text} · ส่ง ${formatThaiDate(trip.delivery_date)}`;
  const shareText = `${shareTitle} เวลา ${trip.delivery_time_start.slice(0, 5)}-${trip.delivery_time_end.slice(0, 5)} น. ที่ ${trip.delivery_location} · ค่าหิ้ว ${trip.service_fee.toFixed(0)} บาท กดสั่งได้เลยในแอปหิ้วชัยภูมิ`;

  const handleShare = async () => {
    // มือถือส่วนใหญ่รองรับ Web Share API — เด้ง share sheet ของเครื่อง (LINE, FB, Messenger ฯลฯ) ให้เลย
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
        return;
      } catch {
        // ผู้ใช้กดยกเลิก share sheet — ไม่ต้องทำอะไรต่อ
        return;
      }
    }
    // เดสก์ท็อป/เบราว์เซอร์ที่ไม่รองรับ — เปิดเมนูเลือกช่องทางแทน
    setOpen((v) => !v);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast("คัดลอกลิงก์แล้ว ✓");
    } catch {
      showToast("คัดลอกไม่สำเร็จ ลองใหม่อีกครั้ง", "error");
    }
    setOpen(false);
  };

  const openWindow = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=600");
    setOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={handleShare}
        className={
          className ||
          "focus-ring flex shrink-0 items-center gap-1.5 rounded-full border border-ink/15 px-3 py-2 text-xs font-medium text-ink hover:bg-ink/5"
        }
      >
        <IconShare className="h-4 w-4" />
        {label}
      </button>

      {open && (
        <div
          role="menu"
          className="surface-card absolute right-0 top-full z-30 mt-2 w-56 overflow-hidden !rounded-2xl p-1.5 shadow-lifted"
        >
          <div className="flex items-center justify-between px-2 pb-1 pt-0.5">
            <p className="text-xs font-medium text-ink/45">แชร์เที่ยวหิ้วนี้</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="ปิด"
              className="focus-ring rounded-full p-1 text-ink/40 hover:bg-ink/5"
            >
              <IconX className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => openWindow(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`)}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-ink hover:bg-ink/5"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1877F2] text-xs font-bold text-white">f</span>
            Facebook
          </button>
          <button
            type="button"
            onClick={() =>
              openWindow(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`)
            }
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-ink hover:bg-ink/5"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-line text-[10px] font-bold text-white">LINE</span>
            LINE
          </button>
          <button
            type="button"
            onClick={copyLink}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-ink hover:bg-ink/5"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink/10 text-ink/60">
              <IconLink className="h-3.5 w-3.5" />
            </span>
            คัดลอกลิงก์
          </button>
        </div>
      )}
    </div>
  );
}
