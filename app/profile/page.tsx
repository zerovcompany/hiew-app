"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { signOutEverywhere } from "@/lib/supabase/useUser";
import type { Profile } from "@/lib/types";
import { IconShieldCheck, IconLogout } from "@/components/Icons";
import MapPicker from "@/components/MapPicker";
import type { BuyerAddress } from "@/lib/types";

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

  const [promptPayInput, setPromptPayInput] = useState("");
  const [savingPromptPay, setSavingPromptPay] = useState(false);
  const [promptPaySaved, setPromptPaySaved] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);
  const [addresses, setAddresses] = useState<BuyerAddress[]>([]);
  const [addressLabel, setAddressLabel] = useState("บ้าน");
  const [recipientName, setRecipientName] = useState("");
  const [addressPhone, setAddressPhone] = useState("");
  const [addressText, setAddressText] = useState("");
  const [addressLat, setAddressLat] = useState<number | null>(null);
  const [addressLng, setAddressLng] = useState<number | null>(null);
  const [savingAddress, setSavingAddress] = useState(false);
  const [lineEnabled, setLineEnabled] = useState(true);
  const [savingLine, setSavingLine] = useState(false);
  const [lineFriend, setLineFriend] = useState(false);
  const [checkingLine, setCheckingLine] = useState(false);
  const [lineAddOpened, setLineAddOpened] = useState(false);

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
      setLineFriend((data as Profile).line_friend === true);
      setPromptPayInput((data as Profile).promptpay_id ?? "");
      setPhoneInput((data as Profile).phone ?? "");
      setAddressPhone((data as Profile).phone ?? "");
      setRecipientName((data as Profile).display_name ?? "");
      const { data: addressRows } = await supabase.from("buyer_addresses").select("*").order("is_default", { ascending: false }).order("created_at", { ascending: false });
      setAddresses((addressRows as BuyerAddress[]) ?? []);
      const { data: pref } = await supabase.from("line_notification_preferences").select("enabled").eq("profile_id", uid).maybeSingle();
      if (pref) setLineEnabled(pref.enabled);

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

  const handleSavePromptPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSavingPromptPay(true);
    setPromptPaySaved(false);
    const cleaned = promptPayInput.trim();
    const { error } = await supabase
      .from("profiles")
      .update({ promptpay_id: cleaned || null })
      .eq("id", profile.id);
    setSavingPromptPay(false);
    if (!error) {
      setProfile({ ...profile, promptpay_id: cleaned || null });
      setPromptPaySaved(true);
    }
  };


  const handleSavePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    const phone = phoneInput.replace(/\D/g, "");
    if (phone.length !== 10) return;
    setSavingPhone(true);
    const { error } = await supabase.from("profiles").update({ phone }).eq("id", profile?.id);
    setSavingPhone(false);
    if (!error && profile) { setProfile({ ...profile, phone }); setAddressPhone(phone); }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !recipientName.trim() || !addressPhone.trim() || !addressText.trim() || addressLat == null || addressLng == null) return;
    setSavingAddress(true);
    const { data, error } = await supabase.from("buyer_addresses").insert({ profile_id: profile.id, label: addressLabel.trim() || "บ้าน", recipient_name: recipientName.trim(), phone: addressPhone.replace(/\D/g, ""), address_text: addressText.trim(), latitude: addressLat, longitude: addressLng, is_default: addresses.length === 0 }).select().single();
    setSavingAddress(false);
    if (!error && data) { setAddresses((prev) => [data as BuyerAddress, ...prev.map((a) => ({ ...a, is_default: data.is_default ? false : a.is_default }))]); setAddressText(""); setAddressLat(null); setAddressLng(null); }
  };

  const makeDefaultAddress = async (id: string) => {
    await supabase.from("buyer_addresses").update({ is_default: true }).eq("id", id);
    setAddresses((prev) => prev.map((a) => ({ ...a, is_default: a.id === id })));
  };

  const deleteAddress = async (id: string) => {
    await supabase.from("buyer_addresses").delete().eq("id", id);
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  };

  const toggleLine = async () => {
    if (!profile) return;
    if (!lineFriend) return;
    setSavingLine(true);
    const next = !lineEnabled;
    const { error } = await supabase.from("line_notification_preferences").upsert({ profile_id: profile.id, enabled: next }, { onConflict: "profile_id" });
    setSavingLine(false);
    if (!error) setLineEnabled(next);
  };

  const refreshLineFriendship = () => {
    // Login ใหม่จะตรวจ friendship status กับ LINE และอัปเดต profiles.line_friend
    setCheckingLine(true);
    window.location.href = "/login?line_friend_check=1";
  };

  const openLineAddFriend = () => {
    // เปิด OA ในแท็บใหม่ เพื่อให้หน้านี้ยังอยู่และรอ webhook follow จาก LINE
    const win = window.open("https://lin.ee/Tncf8ut", "_blank", "noopener,noreferrer");
    setLineAddOpened(true);

    // รอ webhook ที่ server อัปเดต profiles.line_friend=true หลังผู้ใช้กดเพิ่มเพื่อน
    if (!win || !profile) return;
    let attempts = 0;
    const timer = window.setInterval(async () => {
      attempts += 1;
      const { data } = await supabase
        .from("profiles")
        .select("line_friend")
        .eq("id", profile.id)
        .maybeSingle();
      if (data?.line_friend === true) {
        window.clearInterval(timer);
        setLineFriend(true);
        setLineEnabled((current) => current);
        setLineAddOpened(false);
      } else if (attempts >= 60) {
        window.clearInterval(timer);
      }
    }, 2000);
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

      <section className="mt-6">
        <h2 className="font-display text-lg text-ink">ข้อมูลติดต่อ</h2>
        <form onSubmit={handleSavePhone} className="surface-card mt-3 space-y-3 p-4">
          <div><label className="field-label">เบอร์โทรศัพท์สำหรับติดต่อ</label><input value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} className="field" inputMode="tel" placeholder="08xxxxxxxx" /></div>
          <button className="btn-secondary w-full" disabled={savingPhone || phoneInput.replace(/\D/g, "").length !== 10}>{savingPhone ? "กำลังบันทึก..." : "บันทึกเบอร์โทร"}</button>
        </form>
      </section>

      <section className="mt-6">
        <h2 className="font-display text-lg text-ink">ที่อยู่จัดส่งของฉัน</h2>
        <p className="mt-1 text-sm text-ink/60">บันทึกไว้ล่วงหน้า แล้วเลือกใช้ตอนสั่งออเดอร์ได้ทันที</p>
        <div className="mt-3 space-y-2">
          {addresses.map((a) => <div key={a.id} className="surface-card p-3">
            <div className="flex items-start justify-between gap-2"><div><p className="font-medium">{a.label} {a.is_default && <span className="text-xs text-krachiao">• ค่าเริ่มต้น</span>}</p><p className="text-sm text-ink/60">{a.recipient_name} · {a.phone}</p><p className="mt-1 text-sm text-ink/70">{a.address_text}</p></div><button type="button" onClick={() => deleteAddress(a.id)} className="text-xs text-red-500">ลบ</button></div>
            {!a.is_default && <button type="button" onClick={() => makeDefaultAddress(a.id)} className="mt-2 text-xs text-krachiao underline">ตั้งเป็นที่อยู่เริ่มต้น</button>}
          </div>)}
        </div>
        <form onSubmit={handleSaveAddress} className="surface-card mt-3 space-y-3 p-4">
          <div className="grid grid-cols-2 gap-3"><input value={addressLabel} onChange={(e)=>setAddressLabel(e.target.value)} className="field" placeholder="ชื่อ เช่น บ้าน" /><input value={recipientName} onChange={(e)=>setRecipientName(e.target.value)} className="field" placeholder="ชื่อผู้รับ" /></div>
          <input value={addressPhone} onChange={(e)=>setAddressPhone(e.target.value)} className="field" placeholder="เบอร์โทรผู้รับ" inputMode="tel" />
          <textarea value={addressText} onChange={(e)=>setAddressText(e.target.value)} rows={2} className="field" placeholder="บ้านเลขที่ / ถนน / จุดสังเกต" />
          <MapPicker lat={addressLat} lng={addressLng} onChange={(lat,lng)=>{setAddressLat(lat);setAddressLng(lng)}} />
          <button className="btn-secondary w-full" disabled={savingAddress || addressLat == null || addressLng == null}>{savingAddress ? "กำลังบันทึก..." : "+ บันทึกที่อยู่นี้"}</button>
        </form>
      </section>

      <section className="mt-6">
        <h2 className="font-display text-lg text-ink">การแจ้งเตือน LINE</h2>
        <div className="surface-card mt-3 p-4 text-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium">สถานะ LINE Official Account</p>
              <p className={`mt-1 text-xs ${lineFriend ? "text-green-700" : "text-red-600"}`}>
                {lineFriend ? "● เพิ่มเพื่อนแล้ว พร้อมรับการแจ้งเตือน" : "● ยังไม่ได้เพิ่มเพื่อน LINE OA"}
              </p>
            </div>
            <button
              type="button"
              onClick={refreshLineFriendship}
              disabled={checkingLine}
              className="rounded-full border border-ink/10 px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-60"
            >
              {checkingLine ? "กำลังตรวจสอบ..." : lineFriend ? "ตรวจสอบอีกครั้ง" : "ตรวจสอบ / เพิ่มเพื่อน"}
            </button>
          </div>
          {!lineFriend && (
            <div className="mt-3 rounded-xl bg-turmeric-light p-3 text-xs leading-5 text-ink/70">
              <p>ยังไม่พบว่าคุณเพิ่ม LINE Official Account ระบบจึงยังส่งแจ้งเตือนไม่ได้</p>
              <button
                type="button"
                onClick={openLineAddFriend}
                className="mt-3 w-full rounded-full bg-line px-4 py-2.5 text-sm font-medium text-white hover:bg-[#05a847]"
              >
                {lineAddOpened ? "กำลังรอการเพิ่มเพื่อน..." : "เพิ่มเพื่อน LINE เพื่อเปิดแจ้งเตือน"}
              </button>
              <p className="mt-2 text-center text-[11px] text-ink/50">
                หลังเพิ่มเพื่อนแล้ว หน้านี้จะตรวจพบอัตโนมัติจาก LINE
              </p>
            </div>
          )}
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-ink/10 pt-3">
            <div><p className="font-medium">แจ้งเตือนออเดอร์สำคัญ</p><p className="mt-1 text-xs text-ink/50">สั่งใหม่ / รับออเดอร์ / ยกเลิก / ส่งสำเร็จ</p></div>
            <button type="button" onClick={toggleLine} disabled={savingLine || !lineFriend} className={`rounded-full px-3 py-1.5 text-xs font-medium ${lineEnabled && lineFriend ? "bg-krachiao text-white" : "bg-ink/10 text-ink/50"}`}>{lineEnabled && lineFriend ? "เปิดอยู่" : "ปิดอยู่"}</button>
          </div>
        </div>
      </section>

      {profile.is_admin && (
        <>
        <Link
          href="/admin/verifications"
          className="focus-ring mt-4 flex items-center gap-3 rounded-xl bg-mudmee px-4 py-3 text-sm font-medium text-white hover:bg-mudmee-dark"
        >
          <IconShieldCheck className="h-5 w-5" />
          ตรวจสอบคำขอยืนยันตัวตน (แอดมิน)
        </Link>
        <Link href="/admin/shops" className="focus-ring mt-2 flex items-center gap-3 rounded-xl border border-ink/10 px-4 py-3 text-sm font-medium text-ink hover:bg-ink/5">
          🏪 จัดการร้านค้าและรูปภาพ (แอดมิน)
        </Link>
        </>
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
          <h2 className="font-display text-lg text-ink">พร้อมเพย์รับเงิน</h2>
          <p className="mt-1 text-sm text-ink/60">
            ใส่เบอร์โทรหรือเลขบัตรประชาชนที่ผูกพร้อมเพย์ไว้ ระบบจะโชว์ QR ให้คนซื้อโอนตอนเลือก &quot;จ่ายเลย&quot;
          </p>
          <form onSubmit={handleSavePromptPay} className="surface-card mt-3 space-y-3 p-4">
            <div>
              <label className="field-label">เบอร์พร้อมเพย์ / เลขบัตรประชาชน</label>
              <input
                value={promptPayInput}
                onChange={(e) => {
                  setPromptPayInput(e.target.value);
                  setPromptPaySaved(false);
                }}
                placeholder="เช่น 0812345678"
                className="field"
                inputMode="numeric"
              />
            </div>
            {promptPaySaved && <p className="text-sm text-emerald-700">บันทึกแล้ว ✓</p>}
            <button type="submit" disabled={savingPromptPay} className="btn-secondary w-full">
              {savingPromptPay ? "กำลังบันทึก..." : "บันทึกพร้อมเพย์"}
            </button>
          </form>
        </section>
      )}

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
