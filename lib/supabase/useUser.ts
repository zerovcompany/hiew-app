"use client";

import { useEffect, useState, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./client";

/**
 * ล้าง session ให้เกลี้ยงทั้งฝั่ง Supabase และ localStorage
 *
 * เหตุผลที่ต้องมี fallback ล้าง localStorage เอง:
 * ถ้า auth user ถูกลบไปแล้วที่ฝั่ง Supabase (เช่น ลบทดสอบตอน dev)
 * แต่ browser ยังเก็บ session/refresh token เดิมอยู่ใน localStorage
 * บางครั้ง supabase.auth.signOut() จะ error (เพราะหา user ไม่เจอ)
 * แล้วค้าง session ผีอยู่แบบนั้น กดออกจากระบบก็ไม่ออกจริง ๆ
 * เลยต้อง force เคลียร์ค่า sb-* ใน localStorage เป็น fallback เสมอ
 */
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
        // localStorage อาจถูกบล็อก (private mode บาง browser) — ข้ามได้ ไม่ critical
      }
    }
  }
}

/**
 * Hook กลางไว้เช็คสถานะล็อกอิน ใช้ร่วมกันทั้ง Nav / BottomNav / หน้าอื่น ๆ
 * loading = true จนกว่าจะเช็ค session ครั้งแรกเสร็จ ป้องกัน UI กระพริบ
 */
export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        // session เสียหรือ token ใช้ไม่ได้แล้ว — เคลียร์ทิ้งเงียบ ๆ ไม่ต้องรบกวนผู้ใช้
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

  return { user, loading, signOut };
}
