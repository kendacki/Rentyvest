import Link from 'next/link';

const FOOTER_LINKS = {
  Product: [
    { href: '/marketplace', label: 'Marketplace' },
    { href: '/dashboard', label: 'Portfolio' },
    { href: '/wallet', label: 'Wallet & faucet' },
  ],
  Platform: [
    { href: '/marketplace', label: 'Property pools' },
    { href: '/wallet', label: 'Canton wallet' },
    { href: '/dashboard', label: 'Equity NFTs' },
  ],
} as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-neutral-800 bg-brand-black text-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-orange text-sm font-bold text-white">
                R
              </span>
              <span className="text-lg font-bold tracking-tight">RentyVest</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-neutral-400">
              Fractional real estate on Canton Network. Pledge per-slot, hold
              on-chain equity NFTs, and track yield — all with programmable
              transparency.
            </p>
          </div>

          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-orange">
                {title}
              </p>
              <ul className="mt-4 space-y-3">
                {links.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-sm text-neutral-400 transition-colors hover:text-white"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-neutral-800 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-neutral-500">
            © {new Date().getFullYear()} RentyVest. Built on Canton DevNet.
          </p>
          <p className="text-sm text-neutral-500">
            Testnet only — not financial advice.
          </p>
        </div>
      </div>
    </footer>
  );
}
