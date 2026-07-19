import Link from 'next/link';
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

  return (
    <article className="card-surface group flex flex-col overflow-hidden p-3 transition-shadow hover:shadow-xl">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-neutral-100">
        {property.image_url ? (
          <img
            src={property.image_url}
            alt={property.title}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-sm font-medium text-neutral-500">
            Property image
          </div>
        )}

        <div className="absolute left-3 top-3 rounded-full border border-white/60 bg-white/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-black shadow-sm backdrop-blur-md">
          Fractional Ownership
        </div>

        <div
          className={`absolute bottom-3 right-3 rounded-full border px-3 py-1 text-xs font-semibold shadow-sm backdrop-blur-md ${
            isSoldOut
              ? 'border-white/20 bg-brand-black/80 text-white'
              : 'border-white/30 bg-brand-orange/90 text-white'
          }`}
        >
          {isSoldOut ? 'Fully subscribed' : `${slotsRemaining} slots left`}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 px-2 pb-2 pt-4 sm:px-3 sm:pb-3">
        <div className="space-y-1.5">
          <h3 className="line-clamp-2 text-lg font-bold leading-tight tracking-[-0.01em] text-brand-black">
            {property.title}
          </h3>
          <p className="flex items-center gap-1.5 text-sm text-neutral-500">
            <LocationPin />
            {location}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="glass-inset p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
              Price per slot
            </p>
            <p className="mt-1 text-xl font-bold tracking-[-0.01em] text-brand-black">
              {formatCurrency(property.unit_price)}
            </p>
            <p className="text-[11px] font-medium text-neutral-500">tUSDC</p>
          </div>

          <div className="glass-accent p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-orange-dark">
              Est. annual yield
            </p>
            <p className="mt-1 text-xl font-bold tracking-[-0.01em] text-brand-orange-dark">
              {formatPercent(property.estimated_annual_yield)}
            </p>
            <p className="text-[11px] font-medium text-brand-orange-dark/70">
              projected
            </p>
          </div>
        </div>

        <div className="glass-inset space-y-2 p-3">
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-600">
            <span>Funding progress</span>
            <span className="text-brand-orange-dark">{fillPercent}%</span>
          </div>

          <div
            className="h-2 w-full overflow-hidden rounded-full border border-white/60 bg-white/50"
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

          <p className="text-[11px] font-medium text-neutral-500">
            {property.slots_filled} of {property.total_units} slots filled
          </p>
        </div>

        <Link
          href={`/pledge/${property.id}`}
          className={`mt-auto inline-flex h-11 items-center justify-center rounded-full px-4 text-sm font-semibold transition-colors ${
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
