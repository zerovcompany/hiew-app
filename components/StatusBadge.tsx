const styles: Record<string, string> = {
  pending: "bg-turmeric-light text-turmeric-dark",
  confirmed: "bg-mudmee-light text-mudmee-dark",
  purchased: "bg-mudmee-light text-mudmee-dark",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-50 text-red-600",
  rejected: "bg-red-50 text-red-600",
  approved: "bg-emerald-100 text-emerald-700",
  open: "bg-emerald-100 text-emerald-700",
  closed: "bg-ink/10 text-ink/60",
  completed: "bg-mudmee-light text-mudmee-dark",
};

const labels: Record<string, string> = {
  pending: "รอดำเนินการ",
  confirmed: "คนหิ้วรับแล้ว",
  purchased: "ซื้อของแล้ว",
  delivered: "ส่งมอบแล้ว",
  cancelled: "ยกเลิกแล้ว",
  rejected: "ไม่ผ่านการยืนยัน",
  approved: "ยืนยันแล้ว",
  open: "เปิดรับอยู่",
  closed: "ปิดรับแล้ว",
  completed: "จบเที่ยวแล้ว",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${styles[status] ?? "bg-ink/10 text-ink/60"}`}>
      {labels[status] ?? status}
    </span>
  );
}
