import Image from 'next/image';
import Link from 'next/link';

export function HeroSection() {
  return (
    <section className="bg-black px-4 pb-16 pt-14 text-white sm:px-6 sm:pb-24 sm:pt-20 lg:px-8">
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
        <div>
          <h1 className="heading-display max-w-3xl">
            Invest in property
            <span className="text-brand-orange"> one slot at a time.</span>
          </h1>
          <p className="body-lead mt-6 max-w-xl text-neutral-400">
            RentyVest turns real estate into transparent on chain pools. Browse
            live listings, pledge with test USDC, and hold equity NFTs that
            prove your stake, settled on Canton Network.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/marketplace" className="btn-primary">
              View live pools
            </Link>
            <Link href="/wallet" className="btn-outline-light">
              Connect wallet
            </Link>
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <div className="relative w-full max-w-sm">
            <div className="rounded-3xl border border-neutral-900 bg-black p-10">
              <Image
                src="/logo.png"
                alt="RentyVest logo"
                width={280}
                height={280}
                className="mx-auto h-auto w-full max-w-[220px]"
                priority
              />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl border border-neutral-900 bg-black px-3 py-4">
                <p className="text-lg font-bold text-brand-orange">Slots</p>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-neutral-500">
                  Per property
                </p>
              </div>
              <div className="rounded-xl border border-neutral-900 bg-black px-3 py-4">
                <p className="text-lg font-bold text-white">NFTs</p>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-neutral-500">
                  On chain proof
                </p>
              </div>
              <div className="rounded-xl border border-neutral-900 bg-black px-3 py-4">
                <p className="text-lg font-bold text-white">Live</p>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-neutral-500">
                  Real time fill
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function StatsSection() {
  const stats = [
    {
      value: 'On ledger',
      label: 'Every pledge settles on Canton with auditable contract IDs.',
    },
    {
      value: 'Live data',
      label: 'Slot availability updates the moment another investor commits.',
    },
    {
      value: 'Wallet native',
      label: 'Connect once via WalletConnect and sign transfers from your party.',
    },
    {
      value: 'Per slot',
      label: 'Enter at the unit price that fits your budget, not a full deed.',
    },
  ];

  return (
    <section className="border-b border-neutral-200 bg-white py-16 sm:py-20">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        {stats.map(({ value, label }) => (
          <div key={value} className="border-l-2 border-brand-orange pl-5">
            <p className="text-2xl font-bold tracking-tight text-black sm:text-[1.75rem]">
              {value}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-neutral-600">
              {label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
