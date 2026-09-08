import type { Metadata } from "next";
import { supabase } from "@/lib/supabase/client";
import TripDetailClient from "./TripDetailClient";

type Props = { params: { id: string } };

// Server Component นี้ทำหน้าที่เดียวคือดึงข้อมูลเที่ยวหิ้วมาใส่ Open Graph metadata
// เพื่อให้ตอนแชร์ลิงก์เที่ยวนี้ไปยัง LINE/Facebook/ฯลฯ ขึ้นการ์ดตัวอย่าง (รูป+ชื่อร้าน+เวลา+ค่าหิ้ว)
// ให้เห็นรายละเอียดโพสต์ทันทีโดยไม่ต้องเปิดแอปก่อน — ส่วน UI/ฟอร์มสั่งซื้อจริงยังอยู่ใน TripDetailClient
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data: trip } = await supabase
    .from("carrier_trips")
    .select("shop_name_text, description, delivery_date, delivery_time_start, delivery_time_end, delivery_location, service_fee, fee_type, cover_image_url, status, profiles(display_name)")
    .eq("id", params.id)
    .maybeSingle();

  if (!trip) {
    return { title: "ไม่พบเที่ยวหิ้วนี้" };
  }

  const t = trip as unknown as {
    shop_name_text: string;
    description: string | null;
    delivery_date: string;
    delivery_time_start: string;
    delivery_time_end: string;
    delivery_location: string;
    service_fee: number;
    fee_type: string;
    cover_image_url: string | null;
    profiles?: { display_name: string } | null;
  };

  const dateLabel = new Date(t.delivery_date).toLocaleDateString("th-TH", { day: "numeric", month: "long" });
  const timeLabel = `${t.delivery_time_start.slice(0, 5)}-${t.delivery_time_end.slice(0, 5)} น.`;
  const carrierName = t.profiles?.display_name ? `หิ้วโดย ${t.profiles.display_name} · ` : "";
  const feeUnit = t.fee_type === "per_order" ? "ออเดอร์" : t.fee_type === "per_item" ? "รายการ" : "เที่ยว";

  const title = `รับหิ้ว ${t.shop_name_text} · ส่ง ${dateLabel}`;
  const description = `${carrierName}เวลา ${timeLabel} ที่ ${t.delivery_location} · ค่าหิ้ว ${t.service_fee.toFixed(0)} บาท/${feeUnit}${
    t.description ? ` — ${t.description}` : ""
  }`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `/trips/${params.id}`,
      images: [{ url: t.cover_image_url || "/og-default.png", width: 1200, height: 630, alt: t.shop_name_text }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [t.cover_image_url || "/og-default.png"],
    },
  };
}

export default function TripDetailPage() {
  return <TripDetailClient />;
}
