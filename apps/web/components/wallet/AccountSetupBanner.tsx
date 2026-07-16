'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useWalletConnect } from '../../providers/WalletConnectProvider';

type AccountSetupBannerProps = {
  variant?: 'inline' | 'card';
};

export function AccountSetupBanner({
  variant = 'inline',
}: AccountSetupBannerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect');
  const authRequired = searchParams.get('reason') === 'auth_required';

  const { isConnected, partyId } = useWalletConnect();
  const { ready, authenticated, login } = usePrivy();

  useEffect(() => {
    if (!ready || !authenticated || !redirectPath) {
      return;
    }

    router.replace(redirectPath);
  }, [authenticated, ready, redirectPath, router]);

  if (!authRequired || !isConnected || !partyId || authenticated) {
    return null;
  }

  const content = (
    <>
      <div>
        <p className="text-sm font-semibold text-brand-black">
          One more step to continue
        </p>
        <p className="mt-1 text-sm text-neutral-600">
          Your Canton wallet is connected. Sign in to access pledges, portfolio
          sync, and faucet history.
        </p>
      </div>
      <button
        type="button"
        onClick={() => {
          void login();
        }}
        className="btn-primary h-11 shrink-0 px-6 text-sm"
      >
        Sign in to continue
      </button>
    </>
  );

  if (variant === 'card') {
    return (
      <section className="card-surface flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        {content}
      </section>
    );
  }

  return (
    <section className="mb-6 flex flex-col gap-4 rounded-2xl border border-brand-orange/25 bg-brand-orange-light/60 p-5 sm:flex-row sm:items-center sm:justify-between">
      {content}
    </section>
  );
}
