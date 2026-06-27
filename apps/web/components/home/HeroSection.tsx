'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { fadeUp } from './motion';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1400&q=85&auto=format&fit=crop';

export function HeroSection() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-black pt-16">
      <div className="pointer-events-none absolute inset-0 bg-hero-glow" />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center px-5 pb-24 pt-20 text-center sm:px-8 sm:pt-28">
        <motion.p
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mb-6 text-sm font-medium uppercase tracking-[0.2em] text-brand-orange"
        >
          Property that moves with you
        </motion.p>

        <motion.h1
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="text-balance max-w-4xl text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-6xl lg:text-7xl"
        >
          Own real estate.
          <br />
          <span className="text-brand-orange">One fraction at a time.</span>
        </motion.h1>

        <motion.p
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mt-6 max-w-xl text-lg text-white/60 sm:text-xl"
        >
          Buy, hold, and trade tokenized property on Canton. Simple access to
          premium real estate — no gatekeepers, no paperwork maze.
        </motion.p>

        <motion.div
          custom={3}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <Link
            href="/marketplace"
            className="rounded-full bg-brand-orange px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand-orange/25 transition hover:bg-[#e55c00]"
          >
            Explore properties
          </Link>
          <Link
            href="/wallet"
            className="rounded-full border border-white/20 bg-white/5 px-8 py-3.5 text-base font-semibold text-white backdrop-blur transition hover:border-white/40 hover:bg-white/10"
          >
            Connect wallet
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 48 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative mt-16 w-full max-w-3xl"
        >
          <div className="absolute -inset-4 rounded-3xl bg-brand-orange/20 blur-3xl" />
          <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
            <Image
              src={HERO_IMAGE}
              alt="Modern commercial real estate skyline"
              width={1400}
              height={900}
              className="aspect-[16/10] w-full object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between">
              <div className="text-left">
                <p className="text-xs font-medium uppercase tracking-wider text-white/60">
                  Featured listing
                </p>
                <p className="text-lg font-semibold text-white">
                  Downtown Residences
                </p>
              </div>
              <span className="rounded-full bg-brand-orange px-3 py-1 text-sm font-semibold text-white">
                From $50
              </span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="mt-16 flex flex-col items-center gap-2 text-white/40"
        >
          <span className="text-xs uppercase tracking-widest">Keep scrolling</span>
          <motion.svg
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </motion.svg>
        </motion.div>
      </div>
    </section>
  );
}
