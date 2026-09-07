"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { signOutEverywhere } from "@/lib/supabase/useUser";
import type { Profile } from "@/lib/types";
import { IconShieldCheck, IconLogout } from "@/components/Icons";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileMissing, setProfileMissing] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      const uid = sessionData.session?.user.id;

      // session เสียหรือหมดอายุ (เช่น token ค้างจาก user ที่ถูกลบไปแล้ว) -> เคลียร์แล้วเด้งไป login
      if (sessionErr || !uid) {
        if (sessionErr) await signOutEverywhere();
        router.push("/login");
        return;
      }

      const { data, error } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();

      // มี session อยู่ แต่ไม่มีแถวใน profiles (เช่น ข้อมูลถูกล้างไปตอน dev)
      // แสดงหน้าที่อธิบายได้ พร้อมปุ่มออกจากระบบ แทนหน้าเปล่า ๆ ที่กดอะไรไม่ได้
      if (error || !data) {
        setProfileMissing(true);
        setLoading(false);
        return;
      }

      setProfile(data as Profile);

      const { data: verif } = await supabase
        .from("carrier_verifications")
        .select("status")
        .eq("profile_id", uid)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setVerificationStatus(verif?.status ?? null);
      setLoading(false);
    };
    load();
  }, [router]);

  const handleSignOut = async () => {
    await signOutEverywhere();
    router.push("/");
    router.refresh();
  };

  const toggleRole = async (field: "is_buyer" | "is_carrier") => {
    if (!profile) return;
    const updated = { ...profile, [field]: !profile[field] };
    setProfile(updated);
    await supabase.from("profiles").update({ [field]: updated[field] }).eq("id", profile.id);
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !idCardFile || !selfieFile) {
      setUploadMsg("กรุณาแนบรูปบัตรประชาชนและเซลฟี่คู่บัตรให้ครบ");
      return;
    }
    setUploading(true);
    setUploadMsg(null);

    const idCardPath = `${profile.id}/idcard-${Date.now()}.jpg`;
    const selfiePath = `${profile.id}/selfie-${Date.now()}.jpg`;

    const [idCardUp, selfieUp] = await Promise.all([
      supabase.storage.from("verifications").upload(idCardPath, idCardFile),
      supabase.storage.from("verifications").upload(selfiePath, selfieFile),
    ]);

    if (idCardUp.error || selfieUp.error) {
      setUploadMsg("อัปโหลดไม่สำเร็จ ลองใหม่อีกครั้ง");
      setUploading(false);
      return;
    }

    const { error } = await supabase.from("carrier_verifications").insert({
      profile_id: profile.id,
      id_card_image_url: idCardPath,
      selfie_with_id_url: selfiePath,
    });

    setUploading(false);
    if (error) {
      setUploadMsg("บันทึกคำขอไม่สำเร็จ ลองใหม่อีกครั้ง");
    } else {
      setVerificationStatus("pending");
      setUploadMsg(null);
    }
  };

  if (loading) return <main className="mx-auto max-w-md px-4 py-10 text-ink/50">กำลังโหลด...</main>;

  if (profileMissing) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
        <p className="font-display text-lg text-ink">หาข้อมูลโปรไฟล์ไม่เจอ</p>
        <p className="mt-2 text-sm text-ink/60">
          บัญชีของคุณเข้าสู่ระบบอยู่ แต่ระบบหาโปรไฟล์ไม่เจอ ลองออกจากระบบแล้วเข้าสู่ระบบด้วย LINE ใหม่อีกครั้ง
        </p>
        <button onClick={handleSignOut} className="btn-primary mt-6 gap-2">
          <IconLogout className="h-4 w-4" />
          ออกจากระบบ
        </button>
      </main>
    );
  }

  if (!profile) return null;

  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-10">
      <h1 className="font-display text-2xl text-ink">โปรไฟล์ของฉัน</h1>

      <div className="mt-4 ticket-card p-4">
        <p className="font-medium text-ink">{profile.display_name}</p>
        <p className="mt-1 text-sm text-ink/50">
          {profile.rating_count ? `⭐ ${profile.rating_avg} (${profile.rating_count} รีวิว)` : "ยังไม่มีรีวิว"}
        </p>
      </div>

      {profile.is_admin && (
        <Link
          href="/admin/verifications"
          className="focus-ring mt-4 flex items-center gap-3 rounded-xl bg-mudmee px-4 py-3 text-sm font-medium text-white hover:bg-mudmee-dark"
        >
          <IconShieldCheck className="h-5 w-5" />
          ตรวจสอบคำขอยืนยันตัวตน (แอดมิน)
        </Link>
      )}

      <section className="mt-6">
        <h2 className="font-display text-lg text-ink">บทบาทของฉัน</h2>
        <div className="mt-3 space-y-2">
          <label className="surface-card flex items-center justify-between p-3 text-sm">
            คนซื้อ (สั่งหิ้วของ)
            <input type="checkbox" checked={profile.is_buyer} onChange={() => toggleRole("is_buyer")} className="h-5 w-5 accent-krachiao" />
          </label>
          <label className="surface-card flex items-center justify-between p-3 text-sm">
            คนหิ้ว (เปิดรับหิ้วของ)
            <input type="checkbox" checked={profile.is_carrier} onChange={() => toggleRole("is_carrier")} className="h-5 w-5 accent-krachiao" />
          </label>
        </div>
      </section>

      {profile.is_carrier && (
        <section className="mt-6">
          <h2 className="font-display text-lg text-ink">ยืนยันตัวตนคนหิ้ว</h2>

          {verificationStatus === "approved" || profile.carrier_verified ? (
            <p className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
              <IconShieldCheck className="h-4 w-4" /> ยืนยันตัวตนแล้ว เปิดรับหิ้วได้เลย
            </p>
          ) : verificationStatus === "pending" ? (
            <p className="mt-3 rounded-xl bg-turmeric-light p-3 text-sm text-ink">
              คำขออยู่ระหว่างตรวจสอบ ปกติใช้เวลาไม่เกิน 24 ชม.
            </p>
          ) : (
            <form onSubmit={handleVerificationSubmit} className="surface-card mt-3 space-y-3 p-4">
              {verificationStatus === "rejected" && (
                <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                  คำขอก่อนหน้าไม่ผ่าน กรุณาส่งใหม่อีกครั้ง
                </p>
              )}
              <div>
                <label className="field-label">รูปบัตรประชาชน</label>
                <input type="file" accept="image/*" onChange={(e) => setIdCardFile(e.target.files?.[0] ?? null)}
                  className="focus-ring w-full text-sm" />
              </div>
              <div>
                <label className="field-label">เซลฟี่คู่กับบัตรประชาชน</label>
                <input type="file" accept="image/*" onChange={(e) => setSelfieFile(e.target.files?.[0] ?? null)}
                  className="focus-ring w-full text-sm" />
              </div>
              {uploadMsg && <p className="text-sm text-red-600">{uploadMsg}</p>}
              <button type="submit" disabled={uploading} className="btn-primary w-full">
                {uploading ? "กำลังส่ง..." : "ส่งคำขอยืนยันตัวตน"}
              </button>
              <p className="text-xs text-ink/50">
                ข้อมูลของคุณถูกเก็บเป็นความลับ ใช้เพื่อยืนยันตัวตนเท่านั้น
              </p>
            </form>
          )}
        </section>
      )}

      <button
        onClick={handleSignOut}
        className="focus-ring mt-8 flex items-center gap-1.5 text-sm text-ink/50 underline underline-offset-2 hover:text-red-600"
      >
        <IconLogout className="h-4 w-4" />
        ออกจากระบบ
      </button>
    </main>
  );
}
