import type { Metadata, Viewport } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import BottomNav from "@/components/BottomNav";
import { UserProvider } from "@/lib/supabase/useUser";
import { ToastProvider } from "@/lib/toast";

// ใช้ตั้งค่า NEXT_PUBLIC_SITE_URL ใน .env.local เป็นโดเมนจริงตอน deploy
// เพื่อให้ลิงก์แชร์ / รูป Open Graph ที่โพสต์ลง social ทำงานถูกต้อง (ตอนนี้ fallback เป็น localhost)
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "หิ้วชัยภูมิ — แอปรับหิ้วของสำหรับคนชัยภูมิ",
    template: "%s · หิ้วชัยภูมิ",
  },
  description: "หาคนหิ้วของ หรือเปิดรับหิ้วของในชัยภูมิ ง่าย ไว ใจได้",
  manifest: "/site.webmanifest",
  appleWebApp: {
    // เพิ่มเข้าโฮมสกรีนแล้วเปิดแบบเต็มจอเหมือนแอปจริง ไม่มีแถบ URL ของ Safari
    capable: true,
    statusBarStyle: "black-translucent",
    title: "หิ้วชัยภูมิ",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    locale: "th_TH",
    siteName: "หิ้วชัยภูมิ",
    title: "หิ้วชัยภูมิ — แอปรับหิ้วของสำหรับคนชัยภูมิ",
    description: "หาคนหิ้วของ หรือเปิดรับหิ้วของในชัยภูมิ ง่าย ไว ใจได้",
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "หิ้วชัยภูมิ" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "หิ้วชัยภูมิ — แอปรับหิ้วของสำหรับคนชัยภูมิ",
    description: "หาคนหิ้วของ หรือเปิดรับหิ้วของในชัยภูมิ ง่าย ไว ใจได้",
    images: ["/og-default.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#2B4570",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className="min-h-screen font-body">
        <UserProvider>
          <ToastProvider>
            <Nav />
            {children}
            <footer className="mx-auto mt-16 max-w-5xl px-4 py-8 text-center text-xs text-ink/40">
              <span className="block">หิ้วชัยภูมิ · ทำด้วยใจเพื่อคนชัยภูมิ</span>
              <span className="mt-1 block">Developed by <strong className="font-medium text-ink/50">SupremeP</strong></span>
            </footer>
            <BottomNav />
          </ToastProvider>
        </UserProvider>
      </body>
    </html>
  );
}
