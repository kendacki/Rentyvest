import Link from 'next/link';
import { BrandLogo } from '../brand/BrandLogo';

const FOOTER_LINKS = {
  Product: [
    { href: '/marketplace', label: 'Marketplace' },
    { href: '/dashboard', label: 'Portfolio' },
    { href: '/wallet', label: 'Faucet' },
  ],
  Platform: [
    { href: '/marketplace', label: 'Property pools' },
    { href: '/wallet', label: 'Test USDC faucet' },
    { href: '/dashboard', label: 'Equity NFTs' },
  ],
} as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-neutral-900 bg-black text-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <BrandLogo size="sm" variant="light" showWordmark />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-neutral-500">
              Fractional real estate on Canton Network. Pledge per slot, hold
              verifiable equity NFTs, and track yield with full on chain
              transparency.
            </p>
          </div>

          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-brand-orange">
                {title}
              </p>
              <ul className="mt-4 space-y-3">
                {links.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-sm text-neutral-500 transition-colors hover:text-white"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-neutral-900 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-neutral-600">
            © {new Date().getFullYear()} RentyVest. Built on Canton Dev Net.
          </p>
          <p className="text-sm text-neutral-600">
            Testnet only. Not financial advice.
          </p>
        </div>
      </div>
    </footer>
  );
}
