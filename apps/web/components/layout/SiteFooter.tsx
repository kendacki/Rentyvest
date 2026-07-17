import Link from 'next/link';
import { BrandLogo } from '../brand/BrandLogo';

const FOOTER_LINKS = {
  Product: [
    { href: '/marketplace', label: 'Marketplace' },
    { href: '/dashboard', label: 'Portfolio' },
    { href: '/wallet', label: 'Faucet' },
  ],
  Platform: [
    { href: 'https://app.seaport.to/', label: '5N Seaport' },
    { href: '/seller', label: 'Sell Property' },
    { href: 'https://devnet.cantonloop.com/', label: 'Loop Wallet' },
  ],
} as const;

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden bg-[#f7f7f7]">
      <div className="relative z-10 mx-auto max-w-6xl px-4 pt-20 pb-4 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-neutral-200/70 bg-white px-8 py-12 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_20px_64px_rgba(0,0,0,0.07)] sm:px-12 sm:py-14">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.55fr)_1fr_1fr] lg:gap-14">
            <div className="sm:col-span-2 lg:col-span-1">
              <BrandLogo size="sm" variant="dark" showWordmark />
              <p className="mt-5 max-w-xs text-sm leading-relaxed text-neutral-500">
                Fractional real estate on Canton Network. Pledge per slot, hold
                verifiable equity NFTs, and track yield with full on chain
                transparency.
              </p>
            </div>

            {Object.entries(FOOTER_LINKS).map(([title, links]) => (
              <div key={title}>
                <p className="text-sm font-semibold text-brand-black">{title}</p>
                <ul className="mt-4 space-y-3">
                  {links.map(({ href, label }) => (
                    <li key={`${title}-${label}`}>
                      {href.startsWith('http') ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-neutral-500 transition-colors hover:text-brand-black"
                        >
                          {label}
                        </a>
                      ) : (
                        <Link
                          href={href}
                          className="text-sm text-neutral-500 transition-colors hover:text-brand-black"
                        >
                          {label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 border-t border-neutral-200 pt-8">
            <p className="text-sm text-neutral-500">
              © {new Date().getFullYear()} RentyVest. Built on Canton DevNet.
            </p>
          </div>
        </div>
      </div>

      <div
        className="pointer-events-none relative -mt-6 flex justify-center overflow-hidden pb-2 pt-4 sm:-mt-10"
        aria-hidden
      >
        <span className="translate-y-[32%] select-none whitespace-nowrap text-[clamp(4.5rem,20vw,12.5rem)] font-bold leading-[0.85] tracking-[-0.045em] text-neutral-200/95">
          RentyVest
        </span>
      </div>
    </footer>
  );
}
