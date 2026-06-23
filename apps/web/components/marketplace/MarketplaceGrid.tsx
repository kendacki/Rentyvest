'use client';

import { PropertyCard } from '../property/PropertyCard';
import { PropertyCardSkeletonGrid } from '../property/PropertyCardSkeleton';
import { usePropertySlots } from '../../hooks/usePropertySlots';

export function MarketplaceGrid() {
  const { properties, isLoading, error, isRealtimeConnected, refetch } =
    usePropertySlots();

  if (isLoading) {
    return (
      <section aria-busy="true" aria-label="Loading marketplace listings">
        <PropertyCardSkeletonGrid count={6} />
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <h2 className="text-lg font-semibold text-red-900">
          Unable to load listings
        </h2>
        <p className="mt-2 text-sm text-red-700">{error}</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-red-900 px-4 text-sm font-semibold text-white hover:bg-red-800"
        >
          Try again
        </button>
      </section>
    );
  }

  if (properties.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
        <h2 className="text-lg font-semibold text-slate-900">
          No active listings yet
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Check back soon for new fractional real estate opportunities.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Active property listings">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          {properties.length} active{' '}
          {properties.length === 1 ? 'listing' : 'listings'}
        </p>
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
            isRealtimeConnected
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-amber-50 text-amber-700'
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              isRealtimeConnected ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
            aria-hidden="true"
          />
          {isRealtimeConnected ? 'Live slot updates' : 'Connecting…'}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
        {properties.map((property) => (
          <PropertyCard key={property.id} property={property} />
        ))}
      </div>
    </section>
  );
}
