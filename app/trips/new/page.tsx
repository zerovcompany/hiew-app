"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import type { Profile, Shop } from "@/lib/types";
import { IconShieldCheck, IconSearch, IconCamera } from "@/components/Icons";

type MenuRow = { name: string; price: string };

export default function NewTripPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [checking, setChecking] = useState(true);

  // ร้านที่มีอยู่แล้วในระบบ ไว้ให้เลือกซ้ำ แทนที่จะพิมพ์ใหม่ทุกครั้ง
  const [existingShops, setExistingShops] = useState<Shop[]>([]);
  const [shopNameText, setShopNameText] = useState("");
  const [shopSearchFocused, setShopSearchFocused] = useState(false);
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

  // รูปปกเที่ยวหิ้ว (ไม่บังคับ) — เหมือนรูปหน้าปกของร้านที่ไปหิ้วรอบนี้ ช่วยให้คนซื้อจำร้านได้ง่ายขึ้น
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleCoverChange = (file: File | null) => {
    setCoverFile(file);
    setCoverPreview(file ? URL.createObjectURL(file) : null);
  };

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

    // โหลดร้านที่เคยมีในระบบไว้ทั้งหมด (เรียงตามยอดนิยมก่อน) ให้เลือกอิงจากของเดิมได้
    supabase
      .from("shops")
      .select("*")
      .order("order_count", { ascending: false })
      .limit(200)
      .then(({ data }) => {
        if (data) setExistingShops(data as Shop[]);
      });
  }, [router]);

  const shopSuggestions = useMemo(() => {
    const q = shopNameText.trim().toLowerCase();
    if (!q) return existingShops.slice(0, 6);
    return existingShops.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 6);
  }, [shopNameText, existingShops]);

  const exactShopMatch = useMemo(
    () => existingShops.find((s) => s.name.trim().toLowerCase() === shopNameText.trim().toLowerCase()),
    [shopNameText, existingShops]
  );

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

    // เช็คว่าร้านนี้เคยถูกสร้างไว้แล้วหรือยัง (ไม่สนตัวพิมพ์เล็ก/ใหญ่/เว้นวรรคหน้า-หลัง)
    // ถ้ามีแล้ว ผูกกับร้านเดิมเลย ถ้ายังไม่มี ค่อยสร้างร้านใหม่เก็บไว้ในระบบ
    // เพื่อให้คนที่มาเปิดรับหิ้วร้านเดียวกันในรอบถัดไป เจอและเลือกร้านเดิมได้ทันที
    const trimmedShopName = shopNameText.trim();
    let shopId: string | null = exactShopMatch?.id ?? null;

    if (!shopId && trimmedShopName) {
      const { data: foundShop } = await supabase
        .from("shops")
        .select("id")
        .ilike("name", trimmedShopName)
        .maybeSingle();

      if (foundShop) {
        shopId = foundShop.id;
      } else {
        const { data: newShop, error: shopErr } = await supabase
          .from("shops")
          .insert({ name: trimmedShopName , carrier_id: trip.carrier_id })
          .select("id")
          .single();
        if (!shopErr && newShop) shopId = newShop.id;
      }
    }

    const { data: trip, error } = await supabase
      .from("carrier_trips")
      .insert({
        carrier_id: carrierId,
        shop_id: shopId,
        shop_name_text: trimmedShopName,
        description: description || null,
        order_cutoff_at: new Date(orderCutoffAt).toISOString(),
        delivery_date: deliveryDate,
        delivery_time_start: timeStart,
        delivery_time_end: timeEnd,
        delivery_location: deliveryLocation,
        service_fee: Number(serviceFee),
        fee_type: feeType,
        max_orders: maxOrders ? Number(maxOrders) : null,
      , carrier_id: trip.carrier_id })
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

    // อัปโหลดรูปปก (ถ้ามี) — ทำหลังสร้างเที่ยวสำเร็จแล้ว เพราะต้องใช้ trip.id เป็นชื่อโฟลเดอร์
    if (coverFile) {
      const ext = coverFile.name.split(".").pop() ?? "jpg";
      const path = `${carrierId}/${trip.id}-${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("trip-images").upload(path, coverFile);
      if (!uploadErr) {
        const { data: publicUrlData } = supabase.storage.from("trip-images").getPublicUrl(path);
        await supabase
          .from("carrier_trips")
          .update({ cover_image_url: publicUrlData.publicUrl })
          .eq("id", trip.id);
      }
      // ถ้าอัปโหลดรูปไม่สำเร็จ ไม่ต้องบล็อกทั้งฟอร์ม เที่ยวหิ้วยังสร้างสำเร็จแล้ว แค่ไม่มีรูปปก
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
          <div className="relative">
            <label className="field-label">ชื่อร้าน *</label>
            <div className="relative">
              <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/30" />
              <input
                value={shopNameText}
                onChange={(e) => setShopNameText(e.target.value)}
                onFocus={() => setShopSearchFocused(true)}
                onBlur={() => setTimeout(() => setShopSearchFocused(false), 150)}
                className="field pl-9"
                placeholder="พิมพ์ชื่อร้าน เช่น ชานมโกลด์ ทีคาเฟ่"
                autoComplete="off"
              />
            </div>

            {exactShopMatch ? (
              <p className="mt-1.5 text-xs text-emerald-700">
                ✓ ใช้ร้านเดิมที่มีอยู่แล้วในระบบ — คนซื้อจะค้นหาร้านนี้เจอง่ายขึ้น
              </p>
            ) : shopNameText.trim() ? (
              <p className="mt-1.5 text-xs text-ink/45">
                ยังไม่มีร้านนี้ในระบบ — ระบบจะบันทึกเป็นร้านใหม่ให้อัตโนมัติ
              </p>
            ) : null}

            {shopSearchFocused && shopSuggestions.length > 0 && (
              <div className="surface-card absolute z-10 mt-1.5 max-h-56 w-full overflow-y-auto !rounded-xl p-1.5 shadow-lifted">
                <p className="px-2 pb-1 pt-0.5 text-xs text-ink/40">ร้านที่มีอยู่แล้วในระบบ</p>
                {shopSuggestions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onMouseDown={() => setShopNameText(s.name)}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm text-ink hover:bg-ink/5"
                  >
                    <span>{s.name}</span>
                    {s.order_count > 0 && (
                      <span className="shrink-0 text-xs text-ink/40">หิ้วแล้ว {s.order_count} ครั้ง</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="field-label">รูปปกร้าน (ไม่บังคับ)</label>
            <label className="surface-card flex cursor-pointer items-center gap-3 p-3 text-sm text-ink/60 hover:bg-ink/5">
              {coverPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverPreview} alt="ตัวอย่างรูปปก" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
              ) : (
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-ink/5 text-ink/30">
                  <IconCamera className="h-6 w-6" />
                </span>
              )}
              <span>{coverFile ? coverFile.name : "แตะเพื่อเลือกรูปปกร้านที่จะไปหิ้ว"}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleCoverChange(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          <div>
            <label className="field-label">รายละเอียดเพิ่มเติม</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              className="field" />
          </div>
          <div>
            <label className="field-label">เมนูที่รับหิ้ว (ไม่บังคับ ช่วยให้คนซื้อเลือกง่ายขึ้น)</label>
            <div className="space-y-2.5">
              {menuRows.map((row, i) => (
                <div key={i} className="surface-card flex items-center gap-2 p-2 focus-within:border-krachiao focus-within:ring-2 focus-within:ring-krachiao/30">
                  <input
                    value={row.name}
                    onChange={(e) => updateMenuRow(i, "name", e.target.value)}
                    placeholder="ชื่อเมนู เช่น ชานมไข่มุก ไซส์ M"
                    className="field min-w-0 flex-1 border-0 bg-transparent p-2 text-base focus-visible:outline-none"
                  />
                  <div className="flex shrink-0 items-center gap-1.5 border-l border-ink/10 pl-2">
                    <input
                      value={row.price}
                      onChange={(e) => updateMenuRow(i, "price", e.target.value)}
                      placeholder="ราคา"
                      type="number"
                      inputMode="numeric"
                      className="field w-20 border-0 bg-transparent p-2 text-base focus-visible:outline-none"
                    />
                    <span className="text-xs text-ink/40">บาท</span>
                    {menuRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setMenuRows((rows) => rows.filter((_, idx) => idx !== i))}
                        aria-label="ลบเมนูนี้"
                        className="focus-ring rounded-full p-1.5 text-ink/30 hover:bg-red-50 hover:text-red-500"
                      >
                        ✕
                      </button>
                    )}
                  </div>
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
