'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { HeroBlob } from './HeroBlob';
import { ConnectWalletButton } from '../wallet/ConnectWalletButton';
import { useCantonWallet } from '../../providers/CantonWalletProvider';

const ease = [0.22, 1, 0.36, 1] as const;

export function HeroSection() {
  const prefersReducedMotion = useReducedMotion();
  const { isConnected } = useCantonWallet();

  return (
    <section className="relative isolate min-h-[calc(100vh-4rem)] overflow-hidden text-white">
      <Image
        src="/hero-architecture.png"
        alt=""
        fill
        priority
        quality={92}
        sizes="100vw"
        className="object-cover object-[center_42%] sm:object-[center_38%]"
        aria-hidden
      />

      <div
        className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/20"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_50%,rgba(255,85,0,0.12),transparent)]"
        aria-hidden
      />
      <div className="absolute inset-0 bg-black/15" aria-hidden />

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10 lg:px-8">
        <div>
          <motion.h1
            className="heading-display max-w-3xl drop-shadow-[0_2px_24px_rgba(0,0,0,0.45)]"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease }}
          >
            Invest in property
            <span className="text-brand-orange"> one slot at a time.</span>
          </motion.h1>
          <motion.p
            className="body-lead mt-6 max-w-xl text-neutral-200 drop-shadow-[0_1px_12px_rgba(0,0,0,0.35)]"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease, delay: 0.1 }}
          >
            Browse live property pools, pledge tUSDC per slot, and own
            equity NFTs on Canton.
          </motion.p>

          <motion.div
            className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease, delay: 0.2 }}
          >
            <Link href="/marketplace" className="btn-primary">
              View live pools
            </Link>
            {!isConnected ? (
              <ConnectWalletButton className="btn-outline-light" />
            ) : (
              <Link href="/wallet" className="btn-outline-light">
                Open faucet
              </Link>
            )}
          </motion.div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <HeroBlob />
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
      <StaggerGrid stats={stats} />
    </section>
  );
}

function StaggerGrid({
  stats,
}: {
  stats: Array<{ value: string; label: string }>;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className="mx-auto grid max-w-7xl gap-10 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.1 } },
      }}
    >
      {stats.map(({ value, label }) => (
        <motion.div
          key={value}
          className="border-l-2 border-brand-orange pl-5"
          variants={
            prefersReducedMotion
              ? undefined
              : {
                  hidden: { opacity: 0, x: -16 },
                  visible: {
                    opacity: 1,
                    x: 0,
                    transition: { duration: 0.5, ease },
                  },
                }
          }
        >
          <p className="text-2xl font-bold tracking-tight text-black sm:text-[1.75rem]">
            {value}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-neutral-600">
            {label}
          </p>
        </motion.div>
      ))}
    </motion.div>
  );
}
