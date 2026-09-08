"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/lib/supabase/useUser";
import { IconHome, IconRoute, IconPlus, IconBag, IconUser } from "./Icons";

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useUser();
  const loggedIn = !!user;

  // "ออเดอร์" เป็นจุดเดียวที่รวมทั้งออเดอร์ที่สั่งและเที่ยวหิ้วที่เปิดรับ (มีแท็บสลับในหน้านั้น)
  // กันไม่ให้มีเมนูที่ดูคล้าย "ออเดอร์" หลายจุดจนสับสนว่าต้องกดอันไหน
  const items = [
    { href: "/", label: "หน้าแรก", icon: IconHome },
    { href: "/trips", label: "เที่ยวหิ้ว", icon: IconRoute },
    { href: loggedIn ? "/trips/new" : "/login", label: "เปิดรับหิ้ว", icon: IconPlus, accent: true },
    { href: loggedIn ? "/orders" : "/login", label: "ออเดอร์", icon: IconBag },
    { href: loggedIn ? "/profile" : "/login", label: "โปรไฟล์", icon: IconUser },
  ];

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-paper/95 backdrop-blur sm:hidden [transform:translateZ(0)] will-change-transform"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-md items-stretch justify-between px-2">
        {items.map(({ href, label, icon: Icon, accent }) => {
          const active = isActive(href);
          if (accent) {
            return (
              <Link
                key={label}
                href={href}
                aria-label={label}
                className="focus-ring -mt-5 flex flex-col items-center gap-1"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-krachiao text-white shadow-lifted">
                  <Icon className="h-6 w-6" />
                </span>
                <span className="text-[11px] font-medium text-krachiao">{label}</span>
              </Link>
            );
          }
          return (
            <Link
              key={label}
              href={href}
              className={`focus-ring flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                active ? "text-krachiao" : "text-ink/50"
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}