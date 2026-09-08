"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IconCalendar, IconChevronLeft, IconChevronRight, IconX } from "@/components/Icons";

const WEEKDAYS_TH = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const MONTHS_TH = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

function toDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function formatFriendly(dateKey: string) {
  // dateKey เป็น YYYY-MM-DD (local) — ต้อง parse แบบ local ไม่ใช้ new Date(string) ตรง ๆ กันเพี้ยน timezone
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = startOfDay(new Date());
  const diffDays = Math.round((startOfDay(date).getTime() - today.getTime()) / 86400000);
  if (diffDays === 0) return "วันนี้";
  if (diffDays === 1) return "พรุ่งนี้";
  return date.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
}

export default function DateFilterPicker({
  value,
  onChange,
}: {
  value: string; // YYYY-MM-DD หรือ "" แปลว่าไม่กรอง
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const today = useMemo(() => startOfDay(new Date()), []);
  const [viewMonth, setViewMonth] = useState(() => {
    if (value) {
      const [y, m] = value.split("-").map(Number);
      return new Date(y, m - 1, 1);
    }
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const selectDate = (d: Date) => {
    onChange(toDateKey(d));
    setOpen(false);
  };

  const quickPicks = [
    { label: "วันนี้", date: today },
    { label: "พรุ่งนี้", date: addDays(today, 1) },
    { label: "สุดสัปดาห์นี้", date: addDays(today, (6 - today.getDay() + 7) % 7 || 6) },
  ];

  // ตารางปฏิทินของเดือนที่กำลังดู — เติมช่องว่างวันจากเดือนก่อน/หลังให้ครบสัปดาห์
  const calendarCells = useMemo(() => {
    const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const startOffset = firstOfMonth.getDay();
    const gridStart = addDays(firstOfMonth, -startOffset);
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  }, [viewMonth]);

  const selectedKey = value || null;

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`focus-ring flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${
          value ? "border-krachiao bg-krachiao/5 text-krachiao" : "border-ink/15 bg-white text-ink/70 hover:bg-ink/5"
        }`}
      >
        <IconCalendar className="h-4 w-4 shrink-0" />
        <span className="whitespace-nowrap">{value ? formatFriendly(value) : "กรองวันที่ส่ง"}</span>
        {value && (
          <span
            role="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
              setOpen(false);
            }}
            className="ml-0.5 rounded-full p-0.5 hover:bg-krachiao/15"
            aria-label="ล้างตัวกรองวันที่"
          >
            <IconX className="h-3.5 w-3.5" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-72 rounded-2xl border border-ink/10 bg-white p-3 shadow-lifted">
          {/* ตัวเลือกด่วน */}
          <div className="flex flex-wrap gap-1.5">
            {quickPicks.map((qp) => (
              <button
                key={qp.label}
                type="button"
                onClick={() => selectDate(qp.date)}
                className={`chip !py-1 ${selectedKey === toDateKey(qp.date) ? "" : ""}`}
                data-active={selectedKey === toDateKey(qp.date)}
              >
                {qp.label}
              </button>
            ))}
          </div>

          {/* ปฏิทินเลือกวันที่เอง */}
          <div className="mt-3 border-t border-ink/10 pt-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                className="focus-ring rounded-full p-1 text-ink/50 hover:bg-ink/5 hover:text-ink"
                aria-label="เดือนก่อนหน้า"
              >
                <IconChevronLeft className="h-4 w-4" />
              </button>
              <p className="text-sm font-medium text-ink">
                {MONTHS_TH[viewMonth.getMonth()]} {viewMonth.getFullYear() + 543}
              </p>
              <button
                type="button"
                onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                className="focus-ring rounded-full p-1 text-ink/50 hover:bg-ink/5 hover:text-ink"
                aria-label="เดือนถัดไป"
              >
                <IconChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-2 grid grid-cols-7 gap-y-1 text-center text-[11px] text-ink/40">
              {WEEKDAYS_TH.map((w) => (
                <div key={w}>{w}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-1 text-center text-sm">
              {calendarCells.map((cell) => {
                const inMonth = cell.getMonth() === viewMonth.getMonth();
                const key = toDateKey(cell);
                const isSelected = key === selectedKey;
                const isToday = key === toDateKey(today);
                const isPast = startOfDay(cell) < today;
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={isPast}
                    onClick={() => selectDate(cell)}
                    className={`focus-ring mx-auto flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
                      isSelected
                        ? "bg-krachiao text-white"
                        : isPast
                        ? "text-ink/20"
                        : inMonth
                        ? "text-ink hover:bg-krachiao/10"
                        : "text-ink/25 hover:bg-ink/5"
                    } ${isToday && !isSelected ? "ring-1 ring-krachiao/50" : ""}`}
                  >
                    {cell.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          {value && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="mt-3 w-full rounded-xl border border-ink/10 py-2 text-sm text-ink/60 hover:bg-ink/5"
            >
              ล้างวันที่ที่เลือก
            </button>
          )}
        </div>
      )}
    </div>
  );
}
