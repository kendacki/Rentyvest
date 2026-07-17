'use client';

import { usePrivy } from '@privy-io/react-auth';
import Link from 'next/link';

type SignInRequiredProps = {
  title?: string;
  description?: string;
  redirectPath?: string;
};

export function SignInRequired({
  title = 'Sign in to continue',
  description = 'Connect your wallet and sign in to access this page.',
  redirectPath = '/seller',
}: SignInRequiredProps) {
  const { ready, login } = usePrivy();

  return (
    <section className="card-surface mx-auto max-w-lg p-8 text-center shadow-sm">
      <h1 className="text-2xl font-bold text-brand-black">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-neutral-600">{description}</p>

      <div className="mt-8">
        {!ready ? (
          <p className="text-sm text-neutral-500">Preparing sign-in…</p>
        ) : (
          <button
            type="button"
            onClick={() => {
              void login();
            }}
            className="btn-primary h-11 px-8 text-sm"
          >
            Sign in with wallet
          </button>
        )}
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
