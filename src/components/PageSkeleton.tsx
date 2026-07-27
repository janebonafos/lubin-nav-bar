export default function PageSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading page"
      aria-busy="true"
      className="min-h-screen bg-gradient-to-b from-[#FBFAFF] to-white"
    >
      {/* Navbar placeholder */}
      <div className="flex items-center justify-between px-6 py-4 sm:px-10">
        <div className="skeleton-shimmer h-8 w-24 rounded-lg" />
        <div className="hidden gap-4 md:flex">
          <div className="skeleton-shimmer h-4 w-20 rounded" />
          <div className="skeleton-shimmer h-4 w-24 rounded" />
          <div className="skeleton-shimmer h-4 w-20 rounded" />
        </div>
        <div className="skeleton-shimmer h-9 w-24 rounded-full" />
      </div>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-6 py-10 sm:px-10">
        <div className="skeleton-shimmer h-7 w-2/3 rounded-lg" />
        <div className="skeleton-shimmer mt-3 h-4 w-1/2 rounded" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-[#EEE9F9] bg-white/70 p-5"
            >
              <div className="skeleton-shimmer h-5 w-1/3 rounded" />
              <div className="skeleton-shimmer mt-3 h-3 w-full rounded" />
              <div className="skeleton-shimmer mt-2 h-3 w-5/6 rounded" />
              <div className="skeleton-shimmer mt-2 h-3 w-2/3 rounded" />
              <div className="skeleton-shimmer mt-5 h-9 w-28 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      <span className="sr-only">Loading…</span>
    </div>
  );
}