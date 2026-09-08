"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { IconCheckCircle, IconAlertCircle } from "@/components/Icons";

type ToastKind = "success" | "error";
type ToastItem = { id: number; message: string; kind: ToastKind };

type ToastContextValue = {
  showToast: (message: string, kind?: ToastKind) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 2600;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback((message: string, kind: ToastKind = "success") => {
    const id = idRef.current++;
    setToasts((prev) => [...prev, { id, message, kind }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, AUTO_DISMISS_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* พื้นที่แสดง toast — ลอยอยู่กลางล่างจอ เหนือ BottomNav เสมอ ไม่บังเนื้อหา */}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`animate-toast-in pointer-events-auto flex max-w-sm items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-white shadow-lifted ${
              t.kind === "success" ? "bg-ink" : "bg-red-600"
            }`}
          >
            {t.kind === "success" ? (
              <IconCheckCircle className="h-4 w-4 shrink-0 text-krachiao" />
            ) : (
              <IconAlertCircle className="h-4 w-4 shrink-0 text-white" />
            )}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast ต้องถูกเรียกภายใน <ToastProvider>");
  return ctx;
}
