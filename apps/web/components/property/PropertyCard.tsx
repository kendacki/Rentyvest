'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  formatCurrency,
  formatLocation,
  formatPercent,
} from '../../lib/format';
import {
  getSlotFillPercent,
  getSlotsRemaining,
  type Property,
} from '../../types/property';

const FALLBACK_PROPERTY_IMAGE = '/properties/ivy-towers.jpg';

type PropertyCardProps = {
  property: Property;
};

function LocationPin() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0 text-brand-orange"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export function PropertyCard({ property }: PropertyCardProps) {
  const slotsRemaining = getSlotsRemaining(property);
  const fillPercent = getSlotFillPercent(property);
  const location = formatLocation(property.city, property.state);
  const isSoldOut = slotsRemaining === 0;
  const preferredImage =
    property.image_url?.trim() || FALLBACK_PROPERTY_IMAGE;
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [preferredImage]);

  const imageSrc = imageFailed ? FALLBACK_PROPERTY_IMAGE : preferredImage;

  return (
    <article className="card-surface flex flex-col overflow-hidden p-2.5 transition-shadow hover:shadow-lg">
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-neutral-100">
        <img
          src={imageSrc}
          alt={property.title}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => {
            if (!imageFailed) {
              setImageFailed(true);
            }
          }}
        />

        <div className="absolute left-2.5 top-2.5 rounded-full border border-white/60 bg-white/70 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-black shadow-sm backdrop-blur-md">
          Fractional Ownership
        </div>

        <div
          className={`absolute bottom-2.5 right-2.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold shadow-sm backdrop-blur-md ${
            isSoldOut
              ? 'border-white/20 bg-brand-black/80 text-white'
              : 'border-white/30 bg-brand-orange/90 text-white'
          }`}
        >
          {isSoldOut ? 'Fully subscribed' : `${slotsRemaining} slots left`}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 px-1.5 pb-1.5 pt-3">
        <div className="space-y-1">
          <h3 className="line-clamp-1 text-base font-bold leading-tight tracking-[-0.01em] text-brand-black">
            {property.title}
          </h3>
          <p className="flex items-center gap-1 text-xs text-neutral-500">
            <LocationPin />
            {location}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="glass-inset px-2.5 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
              Price per slot
            </p>
            <p className="mt-0.5 text-base font-bold tracking-[-0.01em] text-brand-black">
              {formatCurrency(property.unit_price)}{' '}
              <span className="text-[10px] font-semibold text-neutral-500">
                tUSDC
              </span>
            </p>
          </div>

          <div className="glass-accent px-2.5 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-orange-dark">
              Est. annual yield
            </p>
            <p className="mt-0.5 text-base font-bold tracking-[-0.01em] text-brand-orange-dark">
              {formatPercent(property.estimated_annual_yield)}
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-600">
            <span>
              {property.slots_filled} of {property.total_units} slots filled
            </span>
            <span className="text-brand-orange-dark">{fillPercent}%</span>
          </div>

          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200/70"
            role="progressbar"
            aria-valuenow={fillPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${property.title} slot fill progress`}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-orange to-brand-orange-dark transition-[width] duration-300 ease-out"
              style={{ width: `${fillPercent}%` }}
            />
          </div>
        </div>

        <Link
          href={`/pledge/${property.id}`}
          className={`mt-auto inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold transition-colors ${
            isSoldOut
              ? 'cursor-not-allowed border border-white/60 bg-white/40 text-neutral-400 backdrop-blur-md'
              : 'bg-brand-orange text-white hover:bg-brand-orange-dark'
          }`}
          aria-disabled={isSoldOut}
          tabIndex={isSoldOut ? -1 : 0}
          onClick={(event) => {
            if (isSoldOut) {
              event.preventDefault();
            }
          }}
        >
          {isSoldOut ? 'Fully subscribed' : 'View opportunity'}
        </Link>
      </div>
    </article>
  );
}
