'use client';

import Image from 'next/image';
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
      'Pair your Canton wallet through WalletConnect, then claim tUSDC from the in app faucet. No mainnet funds required.',
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
            Own your first slot in three steps
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
    <section className="relative isolate overflow-hidden py-20 text-white sm:py-28">
      <Image
        src="/why-rentyvest-bg.png"
        alt=""
        fill
        quality={92}
        sizes="100vw"
        className="object-cover object-[center_30%] brightness-[1.08] contrast-[1.06] saturate-[1.12]"
        aria-hidden
      />

      <div
        className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/15 to-black/55"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_40%,transparent_0%,rgba(0,0,0,0.35)_100%)]"
        aria-hidden
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl">
          <p className="section-label drop-shadow-sm">Why RentyVest</p>
          <h2 className="heading-section mt-4 drop-shadow-[0_2px_16px_rgba(0,0,0,0.85)]">
            Infrastructure for the next generation of property investing
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-white drop-shadow-[0_1px_12px_rgba(0,0,0,0.8)]">
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
              className="rounded-2xl border border-white/15 bg-black/50 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-colors hover:border-brand-orange/80 hover:bg-black/60"
            >
              <span className="text-sm font-bold text-brand-orange">{number}</span>
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
