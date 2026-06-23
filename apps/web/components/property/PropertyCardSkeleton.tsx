export function PropertyCardSkeleton() {
  return (
    <article
      className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      aria-hidden="true"
    >
      <div className="relative aspect-[4/3] w-full bg-slate-200 animate-pulse" />

      <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
        <div className="space-y-2">
          <div className="h-5 w-[80%] rounded-md bg-slate-200 animate-pulse" />
          <div className="h-4 w-[50%] rounded-md bg-slate-200 animate-pulse" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2 rounded-xl bg-slate-50 p-3">
            <div className="h-3 w-16 rounded bg-slate-200 animate-pulse" />
            <div className="h-6 w-24 rounded bg-slate-200 animate-pulse" />
          </div>
          <div className="space-y-2 rounded-xl bg-slate-50 p-3">
            <div className="h-3 w-20 rounded bg-slate-200 animate-pulse" />
            <div className="h-6 w-16 rounded bg-slate-200 animate-pulse" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="h-3 w-20 rounded bg-slate-200 animate-pulse" />
            <div className="h-3 w-10 rounded bg-slate-200 animate-pulse" />
          </div>
          <div className="h-2 w-full rounded-full bg-slate-200 animate-pulse" />
        </div>

        <div className="mt-auto h-11 w-full rounded-xl bg-slate-200 animate-pulse" />
      </div>
    </article>
  );
}

export function PropertyCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
      {Array.from({ length: count }, (_, index) => (
        <PropertyCardSkeleton key={`property-skeleton-${index}`} />
      ))}
    </div>
  );
}
