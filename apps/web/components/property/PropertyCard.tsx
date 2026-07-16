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

export function PropertyCard({ property }: PropertyCardProps) {
  const slotsRemaining = getSlotsRemaining(property);
  const fillPercent = getSlotFillPercent(property);
  const location = formatLocation(property.city, property.state);
  const isSoldOut = slotsRemaining === 0;

  return (
    <article className="card-surface flex flex-col overflow-hidden transition-shadow hover:shadow-lg">
      <div className="relative aspect-[4/3] w-full bg-neutral-100">
        {property.image_url ? (
          <img
            src={property.image_url}
            alt={property.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-sm font-medium text-neutral-500">
            Property image
          </div>
        )}

        <div className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-black shadow-sm backdrop-blur">
          Token Register
        </div>

        <div
          className={`absolute bottom-3 right-3 rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${
            isSoldOut
              ? 'bg-brand-black text-white'
              : 'bg-brand-orange text-white'
          }`}
        >
          {isSoldOut ? 'Fully subscribed' : `${slotsRemaining} slots left`}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
        <div className="space-y-1">
          <h3 className="line-clamp-2 text-lg font-semibold leading-tight text-brand-black">
            {property.title}
          </h3>
          <p className="text-sm text-neutral-500">{location}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Per slot
            </p>
            <p className="mt-1 text-xl font-bold text-brand-black">
              {formatCurrency(property.unit_price)}
            </p>
          </div>

          <div className="rounded-xl border border-orange-100 bg-brand-orange-light p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-brand-orange-dark">
              Est. Annual Yield
            </p>
            <p className="mt-1 text-xl font-bold text-brand-orange-dark">
              {formatPercent(property.estimated_annual_yield)}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-neutral-600">
            <span>
              {property.slots_filled} / {property.total_units} slots filled
            </span>
            <span>{fillPercent}%</span>
          </div>

          <div
            className="h-2 w-full overflow-hidden rounded-full bg-neutral-200"
            role="progressbar"
            aria-valuenow={fillPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${property.title} slot fill progress`}
          >
            <div
              className="h-full rounded-full bg-brand-orange transition-[width] duration-300 ease-out"
              style={{ width: `${fillPercent}%` }}
            />
          </div>
        </div>

        <Link
          href={`/pledge/${property.id}`}
          className={`mt-auto inline-flex h-11 items-center justify-center rounded-full px-4 text-sm font-semibold transition-colors ${
            isSoldOut
              ? 'cursor-not-allowed bg-neutral-200 text-neutral-500'
              : 'bg-brand-black text-white hover:bg-neutral-800'
          }`}
          aria-disabled={isSoldOut}
          tabIndex={isSoldOut ? -1 : 0}
          onClick={(event) => {
            if (isSoldOut) {
              event.preventDefault();
            }
          }}
        >
          {isSoldOut ? 'No slots available' : 'View opportunity'}
        </Link>
      </div>
    </article>
  );
}
