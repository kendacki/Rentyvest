'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useCantonWallet } from '../../providers/CantonWalletProvider';
import { BrandLogo } from '../brand/BrandLogo';
import { WalletAccountMenu } from '../wallet/WalletAccountMenu';

const PUBLIC_NAV_LINKS = [
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/dashboard', label: 'Portfolio' },
  { href: '/wallet', label: 'Faucet' },
] as const;

const SELLER_NAV_LINK = { href: '/seller', label: 'List property' } as const;

type SiteHeaderProps = {
  variant?: 'light' | 'dark';
};

type NavLinkItem = { href: string; label: string };

function ConnectedSiteHeaderNav({
  pathname,
  isDark,
  onNavigate,
  layout,
}: {
  pathname: string;
  isDark: boolean;
  onNavigate?: () => void;
  layout: 'desktop' | 'mobile';
}) {
  const { isConnected, partyId } = useCantonWallet();
  const navLinks: NavLinkItem[] =
    isConnected && partyId
      ? [...PUBLIC_NAV_LINKS, SELLER_NAV_LINK]
      : [...PUBLIC_NAV_LINKS];

  const className =
    layout === 'desktop'
      ? 'hidden flex-none items-center gap-8 md:flex'
      : 'flex flex-col gap-3';

  return (
    <nav className={className}>
      {navLinks.map(({ href, label }) => (
        <NavLink
          key={href}
          href={href}
          label={label}
          pathname={pathname}
          isDark={isDark}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}

function SiteHeaderNav({
  pathname,
  isDark,
  onNavigate,
  layout,
}: {
  pathname: string;
  isDark: boolean;
  onNavigate?: () => void;
  layout: 'desktop' | 'mobile';
}) {
  return (
    <ConnectedSiteHeaderNav
      pathname={pathname}
      isDark={isDark}
      onNavigate={onNavigate}
      layout={layout}
    />
  );
}

function NavLink({
  href,
  label,
  pathname,
  isDark,
  onNavigate,
}: {
  href: string;
  label: string;
  pathname: string;
  isDark: boolean;
  onNavigate?: () => void;
}) {
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={`text-sm font-medium transition-colors ${
        active
          ? 'text-brand-orange'
          : isDark
            ? 'text-neutral-400 hover:text-white'
            : 'text-neutral-600 hover:text-black'
      }`}
      onClick={onNavigate}
    >
      {label}
    </Link>
  );
}

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

        <SiteHeaderNav pathname={pathname} isDark={isDark} layout="desktop" />

        <div className="flex flex-1 items-center justify-end gap-3">
          <div className="hidden items-center md:flex">
            <WalletAccountMenu variant={isDark ? 'dark' : 'light'} />
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
          <SiteHeaderNav
            pathname={pathname}
            isDark={isDark}
            layout="mobile"
            onNavigate={() => setMenuOpen(false)}
          />
          <div className="mt-2">
            <WalletAccountMenu variant={isDark ? 'dark' : 'light'} />
          </div>
        </div>
      ) : null}
    </header>
  );
}
