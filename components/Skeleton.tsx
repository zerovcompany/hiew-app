export function SkeletonCard() {
  return (
    <div className="ticket-card space-y-3 p-4">
      <div className="skeleton h-3 w-1/3 animate-shimmer" />
      <div className="skeleton h-4 w-2/3 animate-shimmer" />
      <div className="skeleton h-3 w-1/2 animate-shimmer" />
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-ink/10 bg-white">
          <div className="skeleton h-28 w-full animate-shimmer rounded-none" />
          <div className="space-y-2 p-3">
            <div className="skeleton h-3 w-3/4 animate-shimmer" />
            <div className="skeleton h-2.5 w-1/2 animate-shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="mt-4 space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
