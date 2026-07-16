import Link from 'next/link';

const TECH_ITEMS = [
  'Canton Network',
  'Daml Smart Contracts',
  'WalletConnect',
  'Privy Auth',
  'Supabase Realtime',
  'On-chain Equity NFTs',
  'tUSDC Payments',
  'Property Pools',
];

export function TechMarquee() {
  const items = [...TECH_ITEMS, ...TECH_ITEMS];

  return (
    <section className="overflow-hidden border-y border-neutral-800 bg-brand-surface py-5">
      <div className="flex animate-marquee whitespace-nowrap">
        {items.map((item, index) => (
          <span
            key={`${item}-${index}`}
            className="mx-8 text-sm font-medium uppercase tracking-[0.15em] text-neutral-500"
          >
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-brand-black px-4 pb-20 pt-16 text-white sm:px-6 sm:pb-28 sm:pt-24 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.18),transparent_45%)]" />

      <div className="relative mx-auto max-w-7xl">
        <p className="section-label text-brand-orange">Fractional real estate</p>
        <h1 className="heading-display mt-4 max-w-4xl">
          Own property slots
          <span className="text-brand-orange"> on-chain.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-neutral-400">
          RentyVest turns real estate into programmable equity pools on Canton
          Network. Browse vetted properties, pledge with test USDC, and hold
          verifiable NFTs that represent your fractional stake.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link href="/marketplace" className="btn-primary">
            Explore marketplace
          </Link>
          <Link href="/wallet" className="btn-inverse">
            Connect wallet
          </Link>
        </div>
      </div>
    </section>
  );
}

export function StatsSection() {
  const stats = [
    { value: '100%', label: 'On-chain slot ownership' },
    { value: 'Real-time', label: 'Pool fill updates' },
    { value: 'Canton', label: 'Programmable ledger' },
    { value: 'Per-slot', label: 'Fractional entry points' },
  ];

  return (
    <section className="border-b border-neutral-200 bg-white py-16">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        {stats.map(({ value, label }) => (
          <div key={label} className="text-center sm:text-left">
            <p className="text-3xl font-bold tracking-tight text-brand-black sm:text-4xl">
              {value}
            </p>
            <p className="mt-2 text-sm text-neutral-600">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
