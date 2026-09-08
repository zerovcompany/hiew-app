"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

// เช็คว่าตอนนี้กำลังเปิดอยู่ในโหมด standalone (เปิดจากไอคอนที่ปักหมุดหน้าจอโฮม) หรือเปล่า
// ถ้าไม่ใช่ (คือกำลังอยู่ใน Safari/เบราว์เซอร์ปกติ) แปลว่าผู้ใช้ถูก iOS เด้งออกจากไอคอนปักหมุด
// มาทำ LINE Login ใน Safari (เป็นข้อจำกัดของ iOS เอง กันไม่ได้) — เคสนี้ควรบอกผู้ใช้ให้ชัดเจน
// แทนที่จะเด้งเข้า "/" เงียบ ๆ ใน Safari ต่อเลย เพราะผู้ใช้จะงงว่าทำไมไม่กลับไปที่ไอคอนที่ปักหมุด
function isStandalone() {
  if (typeof window === "undefined") return false;
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone;
  return iosStandalone === true || window.matchMedia("(display-mode: standalone)").matches;
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loggedInOutsideApp, setLoggedInOutsideApp] = useState(false);

  useEffect(() => {
    const finishLogin = async (session: NonNullable<Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]>) => {
      const meta = session.user.user_metadata;
      await supabase
        .from("profiles")
        .update({
          display_name: meta.name ?? "ผู้ใช้ใหม่",
          avatar_url: meta.picture ?? null,
        })
        .eq("id", session.user.id)
        .is("avatar_url", null); // อัปเดตแค่ครั้งแรกที่ยังไม่มีรูป

      if (isStandalone()) {
        // อยู่ในไอคอนที่ปักหมุดอยู่แล้ว (ไม่ได้โดนเด้งออกไป Safari) เข้าแอปต่อได้เลยตามปกติ
        router.replace("/");
      } else {
        // โดนเด้งมาทำ login ใน Safari (ข้อจำกัดของ iOS) — session ที่ได้จะถูกแชร์กับไอคอน
        // ที่ปักหมุดไว้อัตโนมัติ (iOS 16.4+ ใช้ที่เก็บคุกกี้ร่วมกัน) ไม่ต้อง login ซ้ำ
        setLoggedInOutsideApp(true);
      }
    };

    // supabase-js อ่าน access_token จาก URL hash ให้อัตโนมัติ (detectSessionInUrl: true คือ default)
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) finishLogin(session);
    });

    // เผื่อ session มีอยู่แล้วตอนโหลดหน้า (บาง browser ยิง event ก่อน listener ติด)
    const timeout = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) finishLogin(data.session);
      else setErrorMsg("เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    }, 3000);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router]);

  if (loggedInOutsideApp) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 text-center">
        <span className="ikat-wash flex h-14 w-14 items-center justify-center rounded-full bg-krachiao font-display text-2xl text-white">
          ✓
        </span>
        <h1 className="mt-5 font-display text-xl font-semibold text-ink">
          เข้าสู่ระบบสำเร็จแล้ว
        </h1>
        <p className="mt-2 text-sm text-ink/70">
          ระบบพาเข้ามาทำการเข้าสู่ระบบผ่าน Safari (เป็นขั้นตอนที่ iOS บังคับเวลาล็อกอินผ่านแอปที่ปักหมุดไว้)
          กลับไปเปิดไอคอนที่ปักหมุดไว้ที่หน้าจอโฮมได้เลย ระบบจะจำการเข้าสู่ระบบไว้ให้อัตโนมัติ ไม่ต้องล็อกอินซ้ำ
        </p>
        <a
          href="/"
          className="focus-ring mt-8 w-full rounded-full bg-krachiao px-6 py-3 font-medium text-white"
        >
          ใช้งานต่อในหน้านี้เลย
        </a>
      </main>
    );
  }

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
