"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./client";

/** ล้าง session ทั้งฝั่ง Supabase และ localStorage (fallback เผื่อ signOut() เงียบ ๆ ล้มเหลว) */
export async function signOutEverywhere() {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.error("signOut error (จะล้าง session ในเครื่องแทน):", err);
  } finally {
    if (typeof window !== "undefined") {
      try {
        Object.keys(window.localStorage)
          .filter((k) => k.startsWith("sb-"))
          .forEach((k) => window.localStorage.removeItem(k));
      } catch {
        // private mode บาง browser อาจบล็อก localStorage — ข้ามได้ ไม่ critical
      }
    }
  }
}

type UserContextValue = { user: User | null; loading: boolean; signOut: () => Promise<void> };
const UserContext = createContext<UserContextValue>({ user: null, loading: true, signOut: async () => {} });

/**
 * subscribe กับ Supabase auth แค่ "ครั้งเดียว" ที่นี่จุดเดียวทั้งแอป
 * ทุก component ที่เรียก useUser() จะอ่านค่าจาก context เดียวกันนี้เสมอ
 * ป้องกันเคส Nav กับ BottomNav เห็นสถานะ login ไม่ตรงกัน (ต้นตอของปุ่มค้าง/ซ้ำที่เจอ)
 */
export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        signOutEverywhere();
        setUser(null);
      } else {
        setUser(data.session?.user ?? null);
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await signOutEverywhere();
    setUser(null);
  }, []);

  return <UserContext.Provider value={{ user, loading, signOut }}>{children}</UserContext.Provider>;
}

export function useUser() {
  return useContext(UserContext);
}
