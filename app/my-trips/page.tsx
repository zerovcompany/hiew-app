"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// เก็บ route เดิมไว้เผื่อมีคน bookmark หรือลิงก์เก่าค้างอยู่
// ของจริงย้ายไปรวมกับ "ออเดอร์ของฉัน" ที่ /orders (แท็บ "ที่ฉันหิ้ว")
export default function LegacyMyTripsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/orders?tab=selling");
  }, [router]);
  return null;
}
