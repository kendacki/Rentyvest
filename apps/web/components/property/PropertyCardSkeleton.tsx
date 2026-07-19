export function PropertyCardSkeleton() {
  return (
    <article
      className="card-surface flex flex-col overflow-hidden p-2.5"
      aria-hidden="true"
    >
      <div className="relative aspect-[16/10] w-full rounded-xl bg-slate-200 animate-pulse" />

      <div className="flex flex-1 flex-col gap-3 px-1.5 pb-1.5 pt-3">
        <div className="space-y-1.5">
          <div className="h-4 w-[75%] rounded-md bg-slate-200 animate-pulse" />
          <div className="h-3 w-[45%] rounded-md bg-slate-200 animate-pulse" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5 rounded-xl bg-slate-50 px-2.5 py-2">
            <div className="h-2.5 w-16 rounded bg-slate-200 animate-pulse" />
            <div className="h-5 w-20 rounded bg-slate-200 animate-pulse" />
          </div>
          <div className="space-y-1.5 rounded-xl bg-slate-50 px-2.5 py-2">
            <div className="h-2.5 w-20 rounded bg-slate-200 animate-pulse" />
            <div className="h-5 w-14 rounded bg-slate-200 animate-pulse" />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="h-3 w-24 rounded bg-slate-200 animate-pulse" />
            <div className="h-3 w-8 rounded bg-slate-200 animate-pulse" />
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-200 animate-pulse" />
        </div>

        <div className="mt-auto h-10 w-full rounded-full bg-slate-200 animate-pulse" />
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
