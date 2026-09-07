"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/supabase/useUser";
import { IconChevronDown, IconLogout, IconUser } from "./Icons";

export default function Nav() {
  const { user, loading, signOut } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!menuOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, [menuOpen]);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
    setMenuOpen(false);
    router.push("/");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-cream/95 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-krachiao text-sm text-white">ห</span>
          หิ้ว<span className="text-krachiao">ชัยภูมิ</span>
        </Link>

        <div className="hidden items-center gap-6 text-sm font-medium text-ink/80 sm:flex">
          <Link href="/" className="hover:text-krachiao">ค้นหาร้าน</Link>
          <Link href="/trips" className="hover:text-krachiao">เที่ยวหิ้วทั้งหมด</Link>
          {user && (
            <>
              <Link href="/trips/new" className="hover:text-krachiao">เปิดรับหิ้ว</Link>
              <Link href="/my-trips" className="hover:text-krachiao">เที่ยวของฉัน</Link>
              <Link href="/my-orders" className="hover:text-krachiao">ออเดอร์ของฉัน</Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {loading ? (
            <div className="skeleton h-9 w-9 rounded-full" />
          ) : user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="focus-ring flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2 hover:bg-ink/5"
              >
                {user.user_metadata?.picture ? (
                  <Image
                    src={user.user_metadata.picture}
                    alt=""
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-full border border-ink/10 object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-mudmee text-sm text-white">
                    {(user.user_metadata?.name ?? "?").charAt(0)}
                  </div>
                )}
                <IconChevronDown className={`h-4 w-4 text-ink/50 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="surface-card absolute right-0 top-full mt-2 w-52 overflow-hidden !rounded-2xl p-1.5 shadow-lifted"
                >
                  <p className="truncate px-3 pb-1.5 pt-1 text-xs text-ink/45">
                    {user.user_metadata?.name ?? "บัญชีของฉัน"}
                  </p>
                  <Link
                    href="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-ink hover:bg-ink/5"
                  >
                    <IconUser className="h-4 w-4 text-ink/50" />
                    โปรไฟล์ของฉัน
                  </Link>
                  <button
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
                  >
                    <IconLogout className="h-4 w-4" />
                    {signingOut ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="btn-primary hidden py-2 text-sm sm:inline-flex">
              เข้าสู่ระบบ
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
