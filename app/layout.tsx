import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import BottomNav from "@/components/BottomNav";

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
        <Nav />
        {children}
        <footer className="mx-auto mt-16 max-w-5xl px-4 py-8 text-center text-xs text-ink/40">
          หิ้วชัยภูมิ · ทำด้วยใจเพื่อคนชัยภูมิ
        </footer>
        <BottomNav />
      </body>
    </html>
  );
}
