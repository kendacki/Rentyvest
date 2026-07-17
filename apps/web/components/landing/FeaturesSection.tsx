'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { ComponentType } from 'react';
import { Reveal, Stagger, staggerItem } from '../motion/Reveal';
import {
  StepBuildingIcon,
  StepBuyPropertyIcon,
  StepWalletIcon,
} from './HowItWorksIcons';
import {
  FeatureAuthIcon,
  FeatureNftIcon,
  FeaturePoolsIcon,
  FeatureRealtimeIcon,
} from './WhyRentyVestIcons';

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
      'Pair your Canton wallet through WalletConnect, then claim tUSDC from the in app faucet. No mainnet funds required.',
    href: '/wallet',
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
    id: 'buy',
    Icon: StepBuyPropertyIcon,
    title: 'Buy a Property',
    description:
      'Pledge tUSDC, receive a PropertyNFT, and track holdings in your portfolio. Transfer equity to another party when you are ready.',
    href: '/dashboard',
    cta: 'Open portfolio',
  },
];

export function HowItWorksSection() {
  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl">
          <p className="section-label">How it works</p>
          <h2 className="heading-section mt-4 text-black">
            Own your first property in three steps
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-neutral-600">
            Connect, pick a pool, and pledge. Fractional real estate on Canton,
            without the complexity.
          </p>
        </Reveal>

        <Stagger className="mt-16 grid gap-5 lg:grid-cols-3">
          {STEPS.map(({ id, Icon, title, description, href, cta }) => (
            <motion.article
              key={id}
              variants={staggerItem}
              className="card-surface group flex flex-col p-8 transition-colors hover:border-black"
            >
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/70 bg-white/40 text-brand-orange shadow-[inset_0_1px_1px_rgba(255,255,255,0.65),0_8px_24px_rgba(0,0,0,0.04)] backdrop-blur-lg">
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

const FEATURES: Array<{
  id: string;
  Icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}> = [
  {
    id: 'pools',
    Icon: FeaturePoolsIcon,
    title: 'Property pools',
    description:
      'Each asset is a Daml PropertyPool with fixed slots, transparent unit pricing, and deadlines enforced directly on the ledger.',
  },
  {
    id: 'auth',
    Icon: FeatureAuthIcon,
    title: 'Split authorization',
    description:
      'Investors sign wallet actions. The platform cosigns admin controlled exercises so pledges stay secure without sacrificing UX.',
  },
  {
    id: 'nft',
    Icon: FeatureNftIcon,
    title: 'Equity NFTs',
    description:
      'Every slot you buy mints a PropertyNFT tied to your party. Verifiable ownership, transferable stakes, yield ready design.',
  },
  {
    id: 'realtime',
    Icon: FeatureRealtimeIcon,
    title: 'Realtime marketplace',
    description:
      'Supabase Realtime pushes slot fill updates instantly. You always see the true state of a pool before you pledge.',
  },
];

export function FeaturesSection() {
  return (
    <section className="relative isolate overflow-hidden bg-black pb-20 pt-16 text-white sm:pb-28 sm:pt-20">
      <Image
        src="/why-rentyvest-architecture.png"
        alt=""
        fill
        priority
        unoptimized
        quality={100}
        sizes="100vw"
        className="object-cover object-center"
        aria-hidden
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mt-6 max-w-2xl sm:mt-8">
          <p className="section-label drop-shadow-sm">Why RentyVest</p>
          <h2 className="heading-section mt-4 drop-shadow-[0_2px_16px_rgba(0,0,0,0.85)]">
            Infrastructure for the next generation of property investing
          </h2>
        </Reveal>

        <Stagger className="mt-24 grid gap-5 sm:mt-28 sm:grid-cols-2 lg:mt-32">
          {FEATURES.map(({ id, Icon, title, description }) => (
            <motion.article
              key={id}
              variants={staggerItem}
              className="rounded-2xl border border-white/15 bg-black/60 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.55)] backdrop-blur-md backdrop-saturate-150 transition-colors hover:border-brand-orange hover:bg-black/75"
            >
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-orange/30 bg-brand-orange/15 text-brand-orange shadow-[0_0_24px_rgba(255,85,0,0.15)]">
                <Icon className="h-8 w-8" />
              </div>
              <h3 className="mt-5 text-xl font-bold tracking-tight text-white">
                {title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-neutral-300">
                {description}
              </p>
            </motion.article>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
