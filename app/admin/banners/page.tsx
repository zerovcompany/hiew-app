"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { PromoBanner } from "@/lib/types";
import { SkeletonCard } from "@/components/Skeleton";
import { IconTrash } from "@/components/Icons";

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const api = async (url: string, options: RequestInit) => {
    const session = await supabase.auth.getSession();
    return fetch(url, { ...options, headers: { ...(options.headers || {}), Authorization: `Bearer ${session.data.session?.access_token ?? ""}` } });
  };

  const load = async () => {
    setLoading(true);
    const res = await api("/api/admin/banners", { method: "GET" });
    const data = await res.json().catch(() => ({}));
    setBanners(res.ok ? (data.banners as PromoBanner[]) : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setMessage(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("link_url", newLinkUrl.trim());
    fd.append("sort_order", String(banners.length));
    const res = await api("/api/admin/banners", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    setUploading(false);
    if (res.ok) {
      setNewLinkUrl("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setMessage("เพิ่มสไลด์แล้ว");
      load();
    } else {
      setMessage(data.error || "อัปโหลดไม่สำเร็จ");
    }
  };

  const patch = async (id: string, updates: Partial<PromoBanner>) => {
    setBanners((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));
    const res = await api("/api/admin/banners", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...updates }) });
    if (!res.ok) { setMessage("บันทึกไม่สำเร็จ"); load(); }
  };

  const remove = async (id: string) => {
    if (!window.confirm("ลบสไลด์นี้ใช่หรือไม่?")) return;
    setBanners((prev) => prev.filter((b) => b.id !== id));
    const res = await api(`/api/admin/banners?id=${id}`, { method: "DELETE" });
    if (!res.ok) { setMessage("ลบไม่สำเร็จ"); load(); }
  };

  const move = (id: string, dir: -1 | 1) => {
    const idx = banners.findIndex((b) => b.id === id);
    const swapWith = idx + dir;
    if (idx < 0 || swapWith < 0 || swapWith >= banners.length) return;
    const reordered = [...banners];
    [reordered[idx], reordered[swapWith]] = [reordered[swapWith], reordered[idx]];
    setBanners(reordered);
    reordered.forEach((b, i) => {
      if (b.sort_order !== i) patch(b.id, { sort_order: i });
    });
  };

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-10">
      <h1 className="font-display text-2xl text-ink">จัดการแบนเนอร์โฆษณาหน้าแรก</h1>
      <p className="mt-1 text-sm text-ink/60">
        รูปที่อัปโหลดจะสไลด์วนอัตโนมัติตรงส่วนหัวของหน้าแรก แนะนำขนาดรูปประมาณ 1200×600 พิกเซล (อัตราส่วน 2:1)
        ไฟล์ JPG หรือ PNG ไม่เกิน 3MB ต่อรูป — ถ้ายังไม่มีสไลด์เลย หน้าแรกจะโชว์ข้อความต้อนรับเดิมแทน
      </p>

      {message && <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}

      <section className="surface-card mt-5 space-y-3 p-4">
        <h2 className="font-display text-base text-ink">เพิ่มสไลด์ใหม่</h2>
        <div>
          <label className="field-label">รูปแบนเนอร์</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="field"
            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
            disabled={uploading}
          />
        </div>
        <div>
          <label className="field-label">ลิงก์เมื่อกดสไลด์ (ไม่บังคับ)</label>
          <input
            value={newLinkUrl}
            onChange={(e) => setNewLinkUrl(e.target.value)}
            placeholder="เช่น /trips/xxxx หรือ https://facebook.com/..."
            className="field"
          />
          <p className="mt-1 text-xs text-ink/45">ใส่ path ในแอป เช่น /trips/xxxx เพื่อพาไปหน้าเที่ยวหิ้ว หรือใส่ URL เต็มเพื่อเปิดหน้าเว็บอื่น</p>
        </div>
        {uploading && <p className="text-xs text-ink/50">กำลังอัปโหลด...</p>}
      </section>

      <section className="mt-6">
        <h2 className="font-display text-lg text-ink">สไลด์ทั้งหมด {banners.length > 0 && `(${banners.length})`}</h2>
        {loading ? (
          <div className="mt-3"><SkeletonCard /></div>
        ) : banners.length === 0 ? (
          <p className="mt-3 rounded-xl bg-ink/5 p-4 text-sm text-ink/60">ยังไม่มีสไลด์ — เพิ่มรูปแรกด้านบนได้เลย</p>
        ) : (
          <div className="mt-3 space-y-3">
            {banners.map((b, i) => (
              <div key={b.id} className="surface-card flex gap-3 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.image_url} alt="แบนเนอร์" className="h-20 w-32 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1 space-y-2">
                  <input
                    value={b.link_url ?? ""}
                    onChange={(e) => setBanners((prev) => prev.map((x) => (x.id === b.id ? { ...x, link_url: e.target.value } : x)))}
                    onBlur={(e) => patch(b.id, { link_url: e.target.value })}
                    placeholder="ลิงก์เมื่อกดสไลด์ (ไม่บังคับ)"
                    className="field text-sm"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => move(b.id, -1)} disabled={i === 0} className="rounded-full border border-ink/10 px-2 py-1 text-xs disabled:opacity-30">↑</button>
                      <button type="button" onClick={() => move(b.id, 1)} disabled={i === banners.length - 1} className="rounded-full border border-ink/10 px-2 py-1 text-xs disabled:opacity-30">↓</button>
                      <button
                        type="button"
                        onClick={() => patch(b.id, { is_active: !b.is_active })}
                        className={`rounded-full px-3 py-1 text-xs font-medium ${b.is_active ? "bg-krachiao text-white" : "bg-ink/10 text-ink/50"}`}
                      >
                        {b.is_active ? "เปิดแสดงอยู่" : "ปิดอยู่"}
                      </button>
                    </div>
                    <button type="button" onClick={() => remove(b.id)} aria-label="ลบสไลด์" className="text-red-500 hover:text-red-600">
                      <IconTrash className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
