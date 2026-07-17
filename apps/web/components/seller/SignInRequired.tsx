'use client';

import Link from 'next/link';
import { ConnectWalletButton } from '../wallet/ConnectWalletButton';

type SignInRequiredProps = {
  title?: string;
  description?: string;
  redirectPath?: string;
};

export function SignInRequired({
  title = 'Connect wallet to continue',
  description = 'Connect your wallet to access this page.',
  redirectPath = '/seller',
}: SignInRequiredProps) {
  return (
    <section className="card-surface mx-auto max-w-lg p-8 text-center shadow-sm">
      <h1 className="text-2xl font-bold text-brand-black">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-neutral-600">{description}</p>

      <div className="mt-8">
        <ConnectWalletButton className="btn-primary h-11 px-8 text-sm" />
      </div>

      <p className="mt-6 text-xs text-neutral-500">
        New to RentyVest?{' '}
        <Link href="/wallet" className="font-semibold text-brand-orange hover:underline">
          Connect wallet &amp; claim tUSDC
        </Link>
      </p>

      <p className="sr-only">Redirect target: {redirectPath}</p>
    </section>
  );
}
