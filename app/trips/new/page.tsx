"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { IconShieldCheck } from "@/components/Icons";

type MenuRow = { name: string; price: string };

export default function NewTripPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [checking, setChecking] = useState(true);

  const [shopNameText, setShopNameText] = useState("");
  const [description, setDescription] = useState("");
  const [orderCutoffAt, setOrderCutoffAt] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [timeStart, setTimeStart] = useState("");
  const [timeEnd, setTimeEnd] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [serviceFee, setServiceFee] = useState("");
  const [feeType, setFeeType] = useState<"per_order" | "per_item" | "flat">("per_order");
  const [maxOrders, setMaxOrders] = useState("");
  const [menuRows, setMenuRows] = useState<MenuRow[]>([{ name: "", price: "" }]);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user.id;
      if (!uid) {
        router.push("/login");
        return;
      }
      const { data } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
      setProfile(data as Profile);
      setChecking(false);
    };
    load();
  }, [router]);

  const updateMenuRow = (i: number, field: keyof MenuRow, value: string) => {
    setMenuRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!shopNameText || !orderCutoffAt || !deliveryDate || !timeStart || !timeEnd || !deliveryLocation || !serviceFee) {
      setFormError("กรุณากรอกข้อมูลที่จำเป็นให้ครบ");
      return;
    }

    setSubmitting(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const carrierId = sessionData.session!.user.id;

    const { data: trip, error } = await supabase
      .from("carrier_trips")
      .insert({
        carrier_id: carrierId,
        shop_name_text: shopNameText,
        description: description || null,
        order_cutoff_at: new Date(orderCutoffAt).toISOString(),
        delivery_date: deliveryDate,
        delivery_time_start: timeStart,
        delivery_time_end: timeEnd,
        delivery_location: deliveryLocation,
        service_fee: Number(serviceFee),
        fee_type: feeType,
        max_orders: maxOrders ? Number(maxOrders) : null,
      })
      .select()
      .single();

    if (error || !trip) {
      setFormError("สร้างเที่ยวหิ้วไม่สำเร็จ ลองใหม่อีกครั้ง");
      console.error(error);
      setSubmitting(false);
      return;
    }

    const validMenuRows = menuRows.filter((r) => r.name.trim());
    if (validMenuRows.length > 0) {
      await supabase.from("trip_menu_items").insert(
        validMenuRows.map((r) => ({
          trip_id: trip.id,
          item_name: r.name.trim(),
          reference_price: r.price ? Number(r.price) : null,
        }))
      );
    }

    setSubmitting(false);
    router.push(`/trips/${trip.id}`);
  };

  if (checking) return <main className="mx-auto max-w-2xl px-4 py-10 text-ink/50">กำลังตรวจสอบสิทธิ์...</main>;

  if (!profile?.carrier_verified) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <IconShieldCheck className="mx-auto h-12 w-12 text-mudmee" />
        <h1 className="mt-4 font-display text-xl text-ink">ต้องยืนยันตัวตนก่อน</h1>
        <p className="mt-2 text-sm text-ink/70">
          เพื่อความปลอดภัยของทุกคน คนที่จะเปิดรับหิ้วต้องยืนยันตัวตนก่อนเสมอ ใช้เวลาไม่นาน
        </p>
        <a href="/profile" className="btn-primary mt-6 inline-flex">
          ไปยืนยันตัวตน
        </a>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-10">
      <h1 className="font-display text-2xl text-ink">เปิดรับหิ้ว</h1>
      <p className="mt-1 text-sm text-ink/60">กรอกรายละเอียดเที่ยวหิ้วให้คนซื้อเห็นครบถ้วน</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="surface-card space-y-4 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-mudmee">ร้านที่จะไปหิ้ว</p>
          <div>
            <label className="field-label">ชื่อร้าน *</label>
            <input value={shopNameText} onChange={(e) => setShopNameText(e.target.value)}
              className="field" placeholder="เช่น ชานมโกลด์ ทีคาเฟ่" />
          </div>
          <div>
            <label className="field-label">รายละเอียดเพิ่มเติม</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              className="field" />
          </div>
          <div>
            <label className="field-label">เมนูที่รับหิ้ว (ไม่บังคับ ช่วยให้คนซื้อเลือกง่ายขึ้น)</label>
            <div className="space-y-2">
              {menuRows.map((row, i) => (
                <div key={i} className="flex gap-2">
                  <input value={row.name} onChange={(e) => updateMenuRow(i, "name", e.target.value)}
                    placeholder="ชื่อเมนู" className="field flex-1" />
                  <input value={row.price} onChange={(e) => updateMenuRow(i, "price", e.target.value)}
                    placeholder="ราคา" type="number" className="field w-24" />
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setMenuRows((r) => [...r, { name: "", price: "" }])}
              className="mt-2 text-sm text-krachiao underline">
              + เพิ่มเมนู
            </button>
          </div>
        </div>

        <div className="surface-card space-y-4 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-mudmee">เวลาและจุดนัดรับ</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">ปิดรับออเดอร์ *</label>
              <input type="datetime-local" value={orderCutoffAt} onChange={(e) => setOrderCutoffAt(e.target.value)}
                className="field" />
            </div>
            <div>
              <label className="field-label">วันที่ส่งของ *</label>
              <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)}
                className="field" />
            </div>
            <div>
              <label className="field-label">เวลาเริ่มส่ง *</label>
              <input type="time" value={timeStart} onChange={(e) => setTimeStart(e.target.value)}
                className="field" />
            </div>
            <div>
              <label className="field-label">เวลาสิ้นสุด *</label>
              <input type="time" value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)}
                className="field" />
            </div>
          </div>
          <div>
            <label className="field-label">จุดนัดรับ *</label>
            <input value={deliveryLocation} onChange={(e) => setDeliveryLocation(e.target.value)}
              placeholder="เช่น หน้าหอพัก ม.ราชภัฏชัยภูมิ" className="field" />
          </div>
        </div>

        <div className="surface-card space-y-4 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-mudmee">ค่าหิ้ว</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="field-label">ค่าหิ้ว (บาท) *</label>
              <input type="number" value={serviceFee} onChange={(e) => setServiceFee(e.target.value)}
                className="field" />
            </div>
            <div>
              <label className="field-label">คิดค่าหิ้วแบบ</label>
              <select value={feeType} onChange={(e) => setFeeType(e.target.value as typeof feeType)}
                className="field">
                <option value="per_order">ต่อออเดอร์</option>
                <option value="per_item">ต่อรายการ</option>
                <option value="flat">เหมาทั้งเที่ยว</option>
              </select>
            </div>
            <div>
              <label className="field-label">จำกัดออเดอร์</label>
              <input type="number" value={maxOrders} onChange={(e) => setMaxOrders(e.target.value)}
                placeholder="ไม่จำกัด" className="field" />
            </div>
          </div>
        </div>

        {formError && <p className="text-sm text-red-600">{formError}</p>}

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? "กำลังเปิดรับหิ้ว..." : "เปิดรับหิ้ว"}
        </button>
      </form>
    </main>
  );
}
