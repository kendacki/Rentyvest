'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import type { ComponentType } from 'react';
import { Reveal, Stagger, staggerItem } from '../motion/Reveal';
import {
  StepBuildingIcon,
  StepOwnershipIcon,
  StepWalletIcon,
} from './HowItWorksIcons';

const STEPS: Array<{
  id: string;
  Icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href: string;
  cta: string;
}> = [
  {
    id: 'connect',
    Icon: StepWalletIcon,
    title: 'Connect and fund',
    description:
      'Pair your Canton wallet through WalletConnect, then claim test USDC from the in app faucet. No mainnet funds required.',
    href: '/marketplace',
    cta: 'Connect wallet',
  },
  {
    id: 'pool',
    Icon: StepBuildingIcon,
    title: 'Pick your pool',
    description:
      'Compare properties by slot price, projected yield, and fill rate. Every listing shows live availability as investors pledge.',
    href: '/marketplace',
    cta: 'Browse marketplace',
  },
  {
    id: 'slot',
    Icon: StepOwnershipIcon,
    title: 'Own your slot',
    description:
      'Pledge tUSDC, receive a PropertyNFT, and track holdings in your portfolio. Transfer equity to another party when you are ready.',
    href: '/dashboard',
    cta: 'Open portfolio',
  },
];

export function HowItWorksSection() {
  return (
    <section className="page-canvas py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl">
          <p className="section-label">How it works</p>
          <h2 className="heading-section mt-4 text-black">
            Three steps from browser to on chain owner
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-neutral-600">
            We stripped away the complexity of tokenized real estate. What
            remains is a clear path: connect, choose, commit.
          </p>
        </Reveal>

        <Stagger className="mt-16 grid gap-5 lg:grid-cols-3">
          {STEPS.map(({ id, Icon, title, description, href, cta }) => (
            <motion.article
              key={id}
              variants={staggerItem}
              className="card-surface group flex flex-col p-8 transition-colors hover:border-black"
            >
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-orange/10 text-brand-orange">
                <Icon className="h-8 w-8" />
              </div>
              <h3 className="mt-5 text-xl font-bold tracking-tight text-black">
                {title}
              </h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-neutral-600">
                {description}
              </p>
              <Link
                href={href}
                className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-black transition-colors group-hover:text-brand-orange"
              >
                {cta}
                <span aria-hidden>→</span>
              </Link>
            </motion.article>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

const FEATURES = [
  {
    number: '01',
    title: 'Property pools',
    description:
      'Each asset is a Daml PropertyPool with fixed slots, transparent unit pricing, and deadlines enforced directly on the ledger.',
  },
  {
    number: '02',
    title: 'Split authorization',
    description:
      'Investors sign wallet actions. The platform cosigns admin controlled exercises so pledges stay secure without sacrificing UX.',
  },
  {
    number: '03',
    title: 'Equity NFTs',
    description:
      'Every slot you buy mints a PropertyNFT tied to your party. Verifiable ownership, transferable stakes, yield ready design.',
  },
  {
    number: '04',
    title: 'Realtime marketplace',
    description:
      'Supabase Realtime pushes slot fill updates instantly. You always see the true state of a pool before you pledge.',
  },
] as const;

export function FeaturesSection() {
  return (
    <section className="bg-black py-20 text-white sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl">
          <p className="section-label">Why RentyVest</p>
          <h2 className="heading-section mt-4">
            Infrastructure for the next generation of property investing
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-neutral-400">
            Not another listing site. A full stack fractional platform with
            ledger settlement, wallet native signing, and investor grade
            transparency built in.
          </p>
        </Reveal>

        <Stagger className="mt-16 grid gap-5 sm:grid-cols-2">
          {FEATURES.map(({ number, title, description }) => (
            <motion.article
              key={number}
              variants={staggerItem}
              className="card-dark p-8 transition-colors hover:border-brand-orange"
            >
              <span className="text-sm font-bold text-brand-orange">{number}</span>
              <h3 className="mt-5 text-xl font-bold tracking-tight">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-neutral-400">
                {description}
              </p>
            </motion.article>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
