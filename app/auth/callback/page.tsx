"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // supabase-js อ่าน access_token จาก URL hash ให้อัตโนมัติ (detectSessionInUrl: true คือ default)
    // แค่รอ event แล้วซิงก์ชื่อ/รูปจาก LINE เข้า profiles ถ้ายังไม่เคยตั้ง
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        const meta = session.user.user_metadata;
        await supabase
          .from("profiles")
          .update({
            display_name: meta.name ?? "ผู้ใช้ใหม่",
            avatar_url: meta.picture ?? null,
          })
          .eq("id", session.user.id)
          .is("avatar_url", null); // อัปเดตแค่ครั้งแรกที่ยังไม่มีรูป

        router.replace("/");
      }
    });

    // เผื่อ session มีอยู่แล้วตอนโหลดหน้า (บาง browser ยิง event ก่อน listener ติด)
    const timeout = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) router.replace("/");
      else setErrorMsg("เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    }, 3000);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router]);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 text-center">
      {errorMsg ? (
        <>
          <p className="text-ink">{errorMsg}</p>
          <a href="/login" className="mt-4 text-krachiao underline">
            กลับไปหน้าเข้าสู่ระบบ
          </a>
        </>
      ) : (
        <p className="text-ink/70">กำลังเข้าสู่ระบบ...</p>
      )}
    </main>
  );
}
