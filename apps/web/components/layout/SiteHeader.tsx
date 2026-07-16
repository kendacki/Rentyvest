'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { BrandLogo } from '../brand/BrandLogo';

const NAV_LINKS = [
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/dashboard', label: 'Portfolio' },
  { href: '/wallet', label: 'Wallet' },
] as const;

type SiteHeaderProps = {
  variant?: 'light' | 'dark';
};

export function SiteHeader({ variant = 'light' }: SiteHeaderProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const isDark = variant === 'dark';

  return (
    <header
      className={`sticky top-0 z-50 border-b ${
        isDark
          ? 'glass-header-dark text-white'
          : 'glass-header-light text-black'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
        <div className="flex flex-1 items-center justify-start">
          <BrandLogo
            size="sm"
            variant={isDark ? 'light' : 'dark'}
            showWordmark
          />
        </div>

        <nav className="hidden flex-none items-center gap-8 md:flex">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link
                key={href}
                href={href}
                className={`text-sm font-medium transition-colors ${
                  active
                    ? 'text-brand-orange'
                    : isDark
                      ? 'text-neutral-400 hover:text-white'
                      : 'text-neutral-600 hover:text-black'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-1 items-center justify-end gap-3">
          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/wallet"
              className={
                isDark
                  ? 'text-sm font-medium text-neutral-400 transition-colors hover:text-white'
                  : 'text-sm font-medium text-neutral-600 transition-colors hover:text-black'
              }
            >
              Connect wallet
            </Link>
            <Link href="/marketplace" className="btn-primary h-10 px-5 text-sm">
              Explore pools
            </Link>
          </div>

          <button
            type="button"
            className={`inline-flex h-10 w-10 items-center justify-center rounded-lg md:hidden ${
              isDark ? 'text-white' : 'text-black'
            }`}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              {menuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div
          className={`border-t px-4 py-4 md:hidden ${
            isDark
              ? 'glass-header-dark'
              : 'glass-header-light'
          }`}
        >
          <nav className="flex flex-col gap-3">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-sm font-medium"
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </Link>
            ))}
            <Link
              href="/marketplace"
              className="btn-primary mt-2 w-full"
              onClick={() => setMenuOpen(false)}
            >
              Explore pools
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
