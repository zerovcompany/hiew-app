import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import BottomNav from "@/components/BottomNav";
import { UserProvider } from "@/lib/supabase/useUser";

export const metadata: Metadata = {
  title: "หิ้วชัยภูมิ — แอปรับหิ้วของสำหรับคนชัยภูมิ",
  description: "หาคนหิ้วของ หรือเปิดรับหิ้วของในชัยภูมิ ง่าย ไว ใจได้",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className="min-h-screen font-body pb-safe-nav sm:pb-0">
        <UserProvider>
          <Nav />
          {children}
          <footer className="mx-auto mt-16 max-w-5xl px-4 py-8 text-center text-xs text-ink/40">
            <span className="block">หิ้วชัยภูมิ · ทำด้วยใจเพื่อคนชัยภูมิ</span>
            <span className="mt-1 block">Developed by <strong className="font-medium text-ink/50">SupremeP</strong></span>
          </footer>
          <BottomNav />
        </UserProvider>
      </body>
    </html>
  );
}
