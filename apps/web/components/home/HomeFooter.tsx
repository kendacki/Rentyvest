'use client';

import Link from 'next/link';
import { BrandLogo } from './BrandLogo';

const footerLinks = [
  { label: 'Marketplace', href: '/marketplace' },
  { label: 'Wallet', href: '/wallet' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Features', href: '#features' },
];

export function HomeFooter() {
  return (
    <footer className="border-t border-white/5 bg-black py-12">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
          <BrandLogo size="sm" />

          <nav className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-white/50">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-white/5 pt-8 text-sm text-white/35 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} RentyVest. All rights reserved.</p>
          <p className="max-w-md">
            DevNet preview. Not financial advice. Tokens are for testing only.
          </p>
        </div>
      </div>
    </footer>
  );
}
