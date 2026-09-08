import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import path from "path";
import { supabase } from "@/lib/supabase/client";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "รายละเอียดเที่ยวหิ้ว";

const BRAND = "#EE0F5F";
const BRAND_DARK = "#A9074A";

type TripMeta = {
  shop_name_text: string;
  delivery_date: string;
  delivery_time_start: string;
  delivery_time_end: string;
  delivery_location: string;
  service_fee: number;
  fee_type: string;
  cover_image_url: string | null;
  profiles?: { display_name: string } | null;
};

// Google Fonts เสิร์ฟไฟล์ truetype ให้แทน woff2 เมื่อเรียกผ่าน css2 endpoint พร้อม query `text`
// (satori ที่ ImageResponse ใช้ข้างใน รองรับเฉพาะ ttf/otf/woff ไม่รองรับ woff2)
async function loadThaiFont(text: string, weight: 400 | 700) {
  const cssUrl = `https://fonts.googleapis.com/css2?family=Sarabun:wght@${weight}&text=${encodeURIComponent(text)}`;
  const css = await fetch(cssUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
  }).then((r) => r.text());
  const match = css.match(/src: url\(([^)]+)\) format\('(?:opentype|truetype)'\)/);
  if (!match) throw new Error("ไม่พบไฟล์ฟอนต์จาก Google Fonts");
  const fontRes = await fetch(match[1]);
  return await fontRes.arrayBuffer();
}

export default async function Image({ params }: { params: { id: string } }) {
  const { data } = await supabase
    .from("carrier_trips")
    .select(
      "shop_name_text, delivery_date, delivery_time_start, delivery_time_end, delivery_location, service_fee, fee_type, cover_image_url, profiles(display_name)"
    )
    .eq("id", params.id)
    .maybeSingle();

  const trip = data as unknown as TripMeta | null;

  const dateLabel = trip
    ? new Date(trip.delivery_date).toLocaleDateString("th-TH", { day: "numeric", month: "long" })
    : "";
  const timeLabel = trip ? `${trip.delivery_time_start.slice(0, 5)}-${trip.delivery_time_end.slice(0, 5)} น.` : "";
  const feeUnit = trip?.fee_type === "per_order" ? "ออเดอร์" : trip?.fee_type === "per_item" ? "รายการ" : "เที่ยว";
  const shopName = trip?.shop_name_text ?? "เที่ยวหิ้ว";
  const location = trip?.delivery_location ?? "";

  // โลโก้แอป — อ่านจาก public/ ตรง ๆ แล้วฝังเป็น base64 กันปัญหา fetch รูปตัวเองตอน render
  let logoSrc = "";
  try {
    const logoPath = path.join(process.cwd(), "public", "logo.png");
    logoSrc = `data:image/png;base64,${readFileSync(logoPath).toString("base64")}`;
  } catch {
    logoSrc = "";
  }

  // โหลดฟอนต์ไทยเฉพาะตัวอักษรที่ใช้จริงในภาพนี้ (เร็วกว่าโหลดทั้งชุด) — ถ้าโหลดไม่สำเร็จ (เช่นเน็ตเวิร์กมีปัญหา)
  // ให้ fallback ไปใช้ฟอนต์ default ของ satori แทน กันหน้าเว็บพังเพราะรูปแชร์สร้างไม่ได้
  const allText = `หิ้วชัยภูมิ รับหิ้ว ส่งค่าหิ้วบาท/ออเดอรายการเที่ยว·📍🗓️0123456789${shopName}${dateLabel}${timeLabel}${feeUnit}${location}`;
  let fonts: { name: string; data: ArrayBuffer; weight: 400 | 700; style: "normal" }[] = [];
  try {
    const [regular, bold] = await Promise.all([loadThaiFont(allText, 400), loadThaiFont(allText, 700)]);
    fonts = [
      { name: "Sarabun", data: regular, weight: 400, style: "normal" },
      { name: "Sarabun", data: bold, weight: 700, style: "normal" },
    ];
  } catch {
    fonts = [];
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: trip?.cover_image_url ? "#1a1a1a" : `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})`,
          fontFamily: "Sarabun",
        }}
      >
        {trip?.cover_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={trip.cover_image_url}
            width={1200}
            height={630}
            style={{ position: "absolute", inset: 0, objectFit: "cover" }}
          />
        )}
        {trip?.cover_image_url && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              background: "linear-gradient(180deg, rgba(20,10,15,0.15) 0%, rgba(20,10,15,0.88) 78%)",
            }}
          />
        )}

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            width: "100%",
            height: "100%",
            padding: "56px 64px",
            color: "white",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
            {logoSrc && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoSrc} width={44} height={44} style={{ borderRadius: 12 }} />
            )}
            <span style={{ fontSize: 24, fontWeight: 700, opacity: 0.9, display: "flex" }}>หิ้วชัยภูมิ</span>
          </div>

          <span style={{ fontSize: 24, opacity: 0.85, marginBottom: 4, display: "flex" }}>รับหิ้ว</span>
          <span
            style={{
              fontSize: 58,
              fontWeight: 700,
              lineHeight: 1.15,
              display: "flex",
              maxWidth: 1000,
            }}
          >
            {shopName}
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 22, fontSize: 30 }}>
            <span style={{ display: "flex" }}>🗓️</span>
            <span style={{ display: "flex" }}>
              ส่ง {dateLabel} · {timeLabel}
            </span>
          </div>

          {/* จุดนัดรับที่คนหิ้วกรอกไว้ — จุดสำคัญที่ต้องเห็นชัดตอนแชร์ */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10, fontSize: 30, maxWidth: 1000 }}>
            <span style={{ display: "flex" }}>📍</span>
            <span style={{ display: "flex" }}>{location}</span>
          </div>

          <div style={{ display: "flex", marginTop: 28 }}>
            <div
              style={{
                display: "flex",
                background: "white",
                color: BRAND,
                fontSize: 28,
                fontWeight: 700,
                padding: "12px 30px",
                borderRadius: 999,
              }}
            >
              ค่าหิ้ว {trip ? trip.service_fee.toFixed(0) : "-"} บาท/{feeUnit}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length ? fonts : undefined }
  );
}
