import Link from 'next/link';

const STEPS = [
  {
    number: '01',
    title: 'Connect your Canton wallet',
    description:
      'Link via WalletConnect on DevNet sandbox. Claim test USDC from the built-in faucet to fund pledges.',
    href: '/wallet',
    cta: 'Open wallet',
  },
  {
    number: '02',
    title: 'Browse property pools',
    description:
      'Explore fractional listings with live slot availability, per-slot pricing, and estimated annual yield.',
    href: '/marketplace',
    cta: 'View marketplace',
  },
  {
    number: '03',
    title: 'Pledge & hold equity NFTs',
    description:
      'Select slots, pay with tUSDC, and receive on-chain PropertyNFTs. Track holdings and transfer stakes from your portfolio.',
    href: '/dashboard',
    cta: 'Go to portfolio',
  },
] as const;

export function HowItWorksSection() {
  return (
    <section className="bg-neutral-50 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="section-label">How it works</p>
          <h2 className="heading-section mt-3 text-brand-black">
            From wallet to ownership in three steps
          </h2>
          <p className="mt-4 text-base leading-relaxed text-neutral-600">
            RentyVest combines Canton ledger settlement with a modern investor
            experience — transparent pools, programmable compliance, and
            real-time updates.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {STEPS.map(({ number, title, description, href, cta }) => (
            <article
              key={number}
              className="card-surface flex flex-col p-6 transition-shadow hover:shadow-lg sm:p-8"
            >
              <span className="text-sm font-semibold text-brand-orange">
                {number}
              </span>
              <h3 className="mt-4 text-xl font-bold tracking-tight text-brand-black">
                {title}
              </h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-neutral-600">
                {description}
              </p>
              <Link
                href={href}
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-orange transition-colors hover:text-brand-orange-dark"
              >
                {cta}
                <span aria-hidden>→</span>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

const FEATURES = [
  {
    number: '01',
    title: 'Property pools',
    description:
      'Each listing is a Daml PropertyPool with fixed slots, transparent pricing, and fundraising deadlines enforced on-ledger.',
  },
  {
    number: '02',
    title: 'Programmable pledges',
    description:
      'Split-authorization architecture: users sign wallet actions while the platform co-signs admin-controlled pool exercises securely.',
  },
  {
    number: '03',
    title: 'Equity NFTs',
    description:
      'Every pledged slot mints a PropertyNFT you can view, transfer, and eventually use to claim yield — all verifiable on Canton.',
  },
  {
    number: '04',
    title: 'Live marketplace data',
    description:
      'Supabase Realtime keeps slot fill progress current so investors always see accurate availability before they commit.',
  },
] as const;

export function FeaturesSection() {
  return (
    <section className="bg-brand-black py-20 text-white sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="section-label">Platform</p>
            <h2 className="heading-section mt-3">Built for fractional investors</h2>
            <p className="mt-4 text-base leading-relaxed text-neutral-400">
              More than a property listing site — RentyVest is infrastructure
              for tokenized real estate with Canton-grade settlement.
            </p>
          </div>
          <Link href="/marketplace" className="btn-primary shrink-0">
            View all pools
          </Link>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          {FEATURES.map(({ number, title, description }) => (
            <article
              key={number}
              className="card-dark p-6 transition-colors hover:border-brand-orange/40 sm:p-8"
            >
              <span className="text-sm font-semibold text-brand-orange">
                {number}
              </span>
              <h3 className="mt-4 text-xl font-bold tracking-tight">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-neutral-400">
                {description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
