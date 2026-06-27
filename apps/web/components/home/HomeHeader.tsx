'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { BrandLogo } from './BrandLogo';

export function HomeHeader() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-black/70 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <BrandLogo size="sm" />

        <nav className="hidden items-center gap-8 text-sm font-medium text-white/70 md:flex">
          <a href="#how-it-works" className="transition hover:text-white">
            How it works
          </a>
          <a href="#features" className="transition hover:text-white">
            Features
          </a>
          <Link href="/marketplace" className="transition hover:text-white">
            Marketplace
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/wallet"
            className="hidden rounded-full px-4 py-2 text-sm font-medium text-white/80 transition hover:text-white sm:inline-flex"
          >
            Wallet
          </Link>
          <Link
            href="/marketplace"
            className="rounded-full bg-brand-orange px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#e55c00]"
          >
            Start investing
          </Link>
        </div>
      </div>
    </motion.header>
  );
}
