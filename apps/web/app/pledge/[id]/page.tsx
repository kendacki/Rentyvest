'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { PageShell } from '../../../components/layout/PageShell';
import { PledgeModal } from '../../../components/pledge/PledgeModal';
import { usePropertySlots } from '../../../hooks/usePropertySlots';

export default function PledgePage() {
  const params = useParams<{ id: string }>();
  const propertyId = params.id;
  const { properties, isLoading, error } = usePropertySlots();
  const [modalOpen, setModalOpen] = useState(true);

  const property = useMemo(
    () => properties.find((item) => item.id === propertyId) ?? null,
    [properties, propertyId],
  );

  if (isLoading) {
    return (
      <PageShell>
        <main className="mx-auto flex min-h-[50vh] max-w-3xl items-center justify-center px-4">
          <p className="text-sm text-neutral-600">Loading property…</p>
        </main>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <main className="mx-auto flex min-h-[50vh] max-w-3xl flex-col items-center justify-center gap-4 px-4 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <Link
            href="/marketplace"
            className="text-sm font-semibold text-brand-orange"
          >
            Back to marketplace
          </Link>
        </main>
      </PageShell>
    );
  }

  if (!property) {
    return (
      <PageShell>
        <main className="mx-auto flex min-h-[50vh] max-w-3xl flex-col items-center justify-center gap-4 px-4 text-center">
          <p className="text-sm text-neutral-600">
            Property not found or no longer active.
          </p>
          <Link
            href="/marketplace"
            className="text-sm font-semibold text-brand-orange"
          >
            Back to marketplace
          </Link>
        </main>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <main className="bg-neutral-50">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            href="/marketplace"
            className="inline-flex text-sm font-medium text-neutral-600 transition-colors hover:text-brand-black"
          >
            ← Back to marketplace
          </Link>

          <div className="card-surface mt-6 p-5 sm:p-6">
            <p className="section-label">Pledge</p>
            <h1 className="mt-2 text-2xl font-bold text-brand-black">
              {property.title}
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              Complete your on-chain pledge with CIP-0056 Test USDC.
            </p>
          </div>

          <PledgeModal
            open={modalOpen}
            onOpenChange={(open) => {
              setModalOpen(open);
              if (!open) {
                window.history.back();
              }
            }}
            property={property}
          />
        </div>
      </main>
    </PageShell>
  );
}
