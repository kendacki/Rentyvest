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
    <article className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="relative aspect-[4/3] w-full bg-slate-100">
        {property.image_url ? (
          <img
            src={property.image_url}
            alt={property.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-sm font-medium text-slate-500">
            Property image
          </div>
        )}

        <div className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700 shadow-sm backdrop-blur">
          Token Register
        </div>

        <div
          className={`absolute bottom-3 right-3 rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${
            isSoldOut
              ? 'bg-slate-900 text-white'
              : 'bg-emerald-600 text-white'
          }`}
        >
          {isSoldOut ? 'Fully subscribed' : `${slotsRemaining} slots left`}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
        <div className="space-y-1">
          <h3 className="line-clamp-2 text-lg font-semibold leading-tight text-slate-900">
            {property.title}
          </h3>
          <p className="text-sm text-slate-500">{location}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Per-Slot
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {formatCurrency(property.unit_price)}
            </p>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
              Est. Annual Yield
            </p>
            <p className="mt-1 text-xl font-bold text-emerald-800">
              {formatPercent(property.estimated_annual_yield)}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-600">
            <span>
              {property.slots_filled} / {property.total_units} slots filled
            </span>
            <span>{fillPercent}%</span>
          </div>

          <div
            className="h-2 w-full overflow-hidden rounded-full bg-slate-200"
            role="progressbar"
            aria-valuenow={fillPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${property.title} slot fill progress`}
          >
            <div
              className="h-full rounded-full bg-emerald-500 transition-[width] duration-300 ease-out"
              style={{ width: `${fillPercent}%` }}
            />
          </div>
        </div>

        <Link
          href={`/pledge/${property.id}`}
          className={`mt-auto inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold transition-colors ${
            isSoldOut
              ? 'cursor-not-allowed bg-slate-200 text-slate-500'
              : 'bg-slate-900 text-white hover:bg-slate-800'
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
