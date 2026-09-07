"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// เก็บ route เดิมไว้เผื่อมีคน bookmark หรือลิงก์เก่าค้างอยู่
// ของจริงย้ายไปรวมกับ "เที่ยวหิ้วของฉัน" ที่ /orders (แท็บ "ที่ฉันสั่ง")
// เพื่อลดความสับสนเรื่องมีเมนู "ออเดอร์" หลายจุดเกินไป
export default function LegacyMyOrdersRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/orders?tab=buying");
  }, [router]);
  return null;
}
