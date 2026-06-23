'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
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
      <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4">
        <p className="text-sm text-slate-600">Loading property...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <Link href="/marketplace" className="text-sm font-semibold text-slate-900">
          Back to marketplace
        </Link>
      </main>
    );
  }

  if (!property) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-sm text-slate-600">Property not found or no longer active.</p>
        <Link href="/marketplace" className="text-sm font-semibold text-slate-900">
          Back to marketplace
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-6">
      <Link
        href="/marketplace"
        className="inline-flex text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        ← Back to marketplace
      </Link>

      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">{property.title}</h1>
        <p className="mt-2 text-sm text-slate-600">
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
    </main>
  );
}
