"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { IconSpinner } from "@/components/Icons";

const ERROR_MESSAGES: Record<string, string> = {
  line_denied: "ยกเลิกการเข้าสู่ระบบด้วย LINE",
  invalid_state: "เซสชันเข้าสู่ระบบหมดอายุ กรุณาลองใหม่อีกครั้ง",
  server_error: "เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบถ้ายังไม่ได้",
};

function LoginContent() {
  const [redirecting, setRedirecting] = useState(false);
  const searchParams = useSearchParams();
  const errorCode = searchParams.get("error");
  const errorMsg = errorCode ? ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.server_error : null;

  const handleLineLogin = () => {
    setRedirecting(true);
    const state = crypto.randomUUID();
    // เก็บ state ไว้เทียบตอน callback (server อ่านจาก cookie นี้เพื่อกัน CSRF)
    document.cookie = `line_oauth_state=${state}; path=/; max-age=600; samesite=lax`;

    const params = new URLSearchParams({
      response_type: "code",
      client_id: process.env.NEXT_PUBLIC_LINE_CHANNEL_ID!,
      redirect_uri: `${window.location.origin}/api/auth/line/callback`,
      state,
      scope: "openid profile",
    });

    window.location.href = `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`;
  };

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <span className="ikat-wash flex h-16 w-16 items-center justify-center rounded-full bg-mudmee font-display text-2xl text-white">
        ห
      </span>
      <h1 className="mt-5 font-display text-2xl font-semibold text-ink">
        เข้าสู่ระบบ
      </h1>
      <p className="mt-2 text-sm text-ink/70">
        เข้าสู่ระบบด้วยบัญชี LINE เพื่อเริ่มสั่งหิ้ว หรือเปิดรับหิ้วของคุณเอง
      </p>

      {errorMsg && (
        <p className="mt-4 w-full rounded-xl bg-red-50 p-3 text-sm text-red-700">{errorMsg}</p>
      )}

      <button
        onClick={handleLineLogin}
        disabled={redirecting}
        className="focus-ring mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-line px-6 py-3 font-medium text-white transition-colors hover:bg-[#05a847] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {redirecting ? (
          <IconSpinner className="h-5 w-5" />
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 5.94 2 10.8c0 4.36 3.55 8 8.35 8.7.32.07.76.21.87.49.1.25.06.65.03.9l-.14 1.08c-.04.32-.25 1.26 1.1.69 1.36-.58 7.32-4.31 9.99-7.38C23.5 12.86 22 10.8 22 10.8 22 5.94 17.52 2 12 2z" />
          </svg>
        )}
        {redirecting ? "กำลังพาไปหน้า LINE..." : "เข้าสู่ระบบด้วย LINE"}
      </button>

      <p className="mt-6 text-xs text-ink/50">
        การเข้าสู่ระบบถือว่ายอมรับเงื่อนไขการใช้งาน
      </p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
