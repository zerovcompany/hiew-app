import Link from "next/link";
import type { CarrierTrip } from "@/lib/types";


function formatThaiDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
  });
}

export default function TripCard({ trip }: { trip: CarrierTrip }) {
  const closingSoon =
    trip.status === "open" &&
    new Date(trip.order_cutoff_at).getTime() - Date.now() < 1000 * 60 * 60 * 3;

  return (
    <Link
      href={`/trips/${trip.id}`}
      className="focus-ring ticket-card group block p-4 pb-5 transition-shadow hover:shadow-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-mudmee">{trip.shop_name_text}</p>
          <h3 className="mt-1 font-display text-lg text-ink group-hover:text-krachiao">
            ส่ง {formatThaiDate(trip.delivery_date)} · {trip.delivery_time_start.slice(0, 5)}-{trip.delivery_time_end.slice(0, 5)} น.
          </h3>
        </div>
        <span className="shrink-0 rounded-full bg-mudmee px-3 py-1.5 text-right font-display text-sm text-white">
          {trip.service_fee.toFixed(0)}.-
        </span>
      </div>

      {trip.description && (
        <p className="mt-2 line-clamp-2 text-sm text-ink/70">{trip.description}</p>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-dashed border-ink/15 pt-3 text-sm">
        <span className="text-ink/60">📍 {trip.delivery_location}</span>
        {closingSoon && (
          <span className="rounded-full bg-turmeric-light px-2.5 py-1 text-xs font-medium text-turmeric-dark">
            ใกล้ปิดรับแล้ว
          </span>
        )}
      </div>

      {trip.profiles?.display_name && (
        <div className="mt-2 text-xs text-ink/50">
          หิ้วโดย <span className="font-medium text-ink/80">{trip.profiles.display_name}</span>
          {trip.profiles.rating_count ? ` · ⭐ ${trip.profiles.rating_avg}` : ""}
        </div>
      )}
    </Link>
  );
}
