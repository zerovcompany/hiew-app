"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import type { CarrierVerification } from "@/lib/types";
import EmptyState from "@/components/EmptyState";
import { SkeletonList } from "@/components/Skeleton";
import { IconShieldCheck } from "@/components/Icons";

export default function AdminVerificationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [items, setItems] = useState<CarrierVerification[]>([]);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const authedFetch = async (path: string, init?: RequestInit) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      router.push("/login");
      throw new Error("no session");
    }
    return fetch(path, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await authedFetch("/api/admin/verifications?status=pending");
      if (res.status === 403 || res.status === 401) {
        setForbidden(true);
        setLoading(false);
        return;
      }
      const json = await res.json();
      setItems(json.data ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const approve = async (id: string) => {
    setBusyId(id);
    await authedFetch(`/api/admin/verifications/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "approve" }),
    });
    setBusyId(null);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const submitReject = async (id: string) => {
    setBusyId(id);
    await authedFetch(`/api/admin/verifications/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "reject", reject_reason: rejectReason || "ไม่ระบุเหตุผล" }),
    });
    setBusyId(null);
    setRejectingId(null);
    setRejectReason("");
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-10">
        <SkeletonList count={2} />
      </main>
    );
  }

  if (forbidden) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="font-display text-xl text-ink">ไม่มีสิทธิ์เข้าถึงหน้านี้</h1>
        <p className="mt-2 text-sm text-ink/60">
          หน้านี้สำหรับแอดมินเท่านั้น หากคุณควรมีสิทธิ์ ให้ตั้งค่า is_admin = true ให้บัญชีนี้ใน Supabase
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-10">
      <div className="flex items-center gap-2">
        <IconShieldCheck className="h-6 w-6 text-mudmee" />
        <h1 className="font-display text-2xl text-ink">คำขอยืนยันตัวตนที่รอตรวจสอบ</h1>
      </div>

      {items.length === 0 ? (
        <EmptyState title="ไม่มีคำขอค้างตรวจสอบตอนนี้" />
      ) : (
        <div className="mt-6 space-y-5">
          {items.map((v) => (
            <div key={v.id} className="surface-card p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium text-ink">{v.profiles?.display_name ?? "ไม่ทราบชื่อ"}</p>
                <p className="text-xs text-ink/50">
                  ส่งเมื่อ {new Date(v.created_at).toLocaleString("th-TH")}
                </p>
              </div>
              {v.profiles?.phone && <p className="mt-0.5 text-sm text-ink/60">โทร {v.profiles.phone}</p>}

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="mb-1 text-xs text-ink/50">บัตรประชาชน</p>
                  {v.id_card_url_signed ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.id_card_url_signed} alt="รูปบัตรประชาชน" className="h-40 w-full rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-40 items-center justify-center rounded-xl bg-ink/5 text-xs text-ink/40">โหลดรูปไม่สำเร็จ</div>
                  )}
                </div>
                <div>
                  <p className="mb-1 text-xs text-ink/50">เซลฟี่คู่บัตร</p>
                  {v.selfie_url_signed ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.selfie_url_signed} alt="เซลฟี่คู่บัตร" className="h-40 w-full rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-40 items-center justify-center rounded-xl bg-ink/5 text-xs text-ink/40">โหลดรูปไม่สำเร็จ</div>
                  )}
                </div>
              </div>

              {rejectingId === v.id ? (
                <div className="mt-3 space-y-2">
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="เหตุผลที่ไม่ผ่าน (จะแสดงให้ผู้ใช้เห็น)"
                    rows={2}
                    className="field"
                  />
                  <div className="flex gap-2">
                    <button
                      disabled={busyId === v.id}
                      onClick={() => submitReject(v.id)}
                      className="flex-1 rounded-full bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      ยืนยันไม่ผ่าน
                    </button>
                    <button onClick={() => setRejectingId(null)} className="flex-1 rounded-full border border-ink/15 py-2 text-sm font-medium text-ink hover:bg-ink/5">
                      ยกเลิก
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex gap-2">
                  <button
                    disabled={busyId === v.id}
                    onClick={() => approve(v.id)}
                    className="flex-1 rounded-full bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    อนุมัติ
                  </button>
                  <button
                    disabled={busyId === v.id}
                    onClick={() => setRejectingId(v.id)}
                    className="flex-1 rounded-full border border-ink/15 py-2 text-sm font-medium text-ink hover:bg-ink/5"
                  >
                    ไม่ผ่าน
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
