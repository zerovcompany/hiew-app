"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Shop } from "@/lib/types";
import { SkeletonCard } from "@/components/Skeleton";

export default function AdminShopsPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => { supabase.from("shops").select("*").order("created_at", { ascending: false }).then(({ data }) => { setShops((data as Shop[]) ?? []); setLoading(false); }); }, []);

  const api = async (url: string, options: RequestInit) => {
    const session = await supabase.auth.getSession();
    return fetch(url, { ...options, headers: { ...(options.headers || {}), Authorization: `Bearer ${session.data.session?.access_token ?? ""}` } });
  };
  const save = async (shop: Shop) => {
    setSaving(shop.id); setMessage(null);
    const res = await api("/api/admin/shops", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(shop) });
    setSaving(null); setMessage(res.ok ? "บันทึกข้อมูลร้านแล้ว" : "บันทึกไม่สำเร็จ");
  };
  const upload = async (shop: Shop, file: File) => {
    setSaving(shop.id); setMessage(null); const fd = new FormData(); fd.append("shop_id", shop.id); fd.append("file", file);
    const res = await api("/api/admin/shops", { method: "POST", body: fd }); const data = await res.json().catch(() => ({})); setSaving(null);
    if (res.ok) { setShops((prev) => prev.map((s) => s.id === shop.id ? { ...s, image_url: data.image_url } : s)); setMessage("อัปโหลดรูปแล้ว"); } else setMessage(data.error || "อัปโหลดไม่สำเร็จ");
  };
  const update = (id: string, key: keyof Shop, value: string) => setShops((prev) => prev.map((s) => s.id === id ? { ...s, [key]: value } : s));

  return <main className="mx-auto max-w-4xl px-4 pb-16 pt-10">
    <h1 className="font-display text-2xl text-ink">จัดการร้านค้า</h1>
    <p className="mt-1 text-sm text-ink/60">แอดมินสามารถใส่รูปและแก้รายละเอียดร้านที่แสดงในหน้า “ร้านทั้งหมด” ได้</p>
    {message && <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
    {loading ? <div className="mt-5"><SkeletonCard /></div> : <div className="mt-5 grid gap-4 sm:grid-cols-2">{shops.map((shop) => <div key={shop.id} className="surface-card p-4">
      <div className="flex gap-3"><div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-ink/5">{shop.image_url ? <img src={shop.image_url} alt={shop.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-2xl text-krachiao">{shop.name[0]}</div>}</div><div className="min-w-0 flex-1"><p className="font-medium">{shop.name}</p><label className="mt-2 block text-xs text-ink/50">รูปภาพร้าน<input type="file" accept="image/*" className="mt-1 w-full text-xs" onChange={(e) => e.target.files?.[0] && upload(shop, e.target.files[0])} /></label></div></div>
      <div className="mt-3 space-y-2"><input className="field" value={shop.name} onChange={(e)=>update(shop.id,"name",e.target.value)} placeholder="ชื่อร้าน" /><input className="field" value={shop.category ?? ""} onChange={(e)=>update(shop.id,"category",e.target.value)} placeholder="หมวดหมู่" /><input className="field" value={shop.address_hint ?? ""} onChange={(e)=>update(shop.id,"address_hint",e.target.value)} placeholder="ที่อยู่/จุดสังเกต" /></div>
      <button onClick={()=>save(shop)} disabled={saving===shop.id} className="btn-primary mt-3 w-full">{saving===shop.id ? "กำลังบันทึก..." : "บันทึก"}</button>
    </div>)}</div>}
  </main>;
}
