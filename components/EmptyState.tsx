import { IconEmptyBox } from "./Icons";
import type { ReactNode } from "react";

export default function EmptyState({
  title,
  action,
  ticket = true,
}: {
  title: ReactNode;
  action?: ReactNode;
  ticket?: boolean;
}) {
  return (
    <div className={`mt-4 flex flex-col items-center gap-3 p-10 text-center text-ink/60 ${ticket ? "ticket-card" : "surface-card"}`}>
      <IconEmptyBox className="h-14 w-14 text-mudmee/40" />
      <p>{title}</p>
      {action}
    </div>
  );
}
