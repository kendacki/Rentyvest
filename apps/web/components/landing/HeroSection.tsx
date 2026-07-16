'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { HeroBlob } from './HeroBlob';

const ease = [0.22, 1, 0.36, 1] as const;

export function HeroSection() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="bg-black px-4 pb-16 pt-14 text-white sm:px-6 sm:pb-24 sm:pt-20 lg:px-8">
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
        <div>
          <motion.h1
            className="heading-display max-w-3xl"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease }}
          >
            Invest in property
            <span className="text-brand-orange"> one slot at a time.</span>
          </motion.h1>
          <motion.p
            className="body-lead mt-6 max-w-xl text-neutral-400"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease, delay: 0.1 }}
          >
            RentyVest turns real estate into transparent on chain pools. Browse
            live listings, pledge with test USDC, and hold equity NFTs that
            prove your stake, settled on Canton Network.
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
            <Link href="/wallet" className="btn-outline-light">
              Connect wallet
            </Link>
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
