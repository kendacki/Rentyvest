'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { fadeUp } from './motion';

const CTA_IMAGE =
  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&q=85&auto=format&fit=crop';

export function GetStarted() {
  return (
    <section className="relative overflow-hidden bg-zinc-950 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          custom={0}
          className="relative overflow-hidden rounded-3xl border border-white/10"
        >
          <Image
            src={CTA_IMAGE}
            alt="Keys to a new home"
            width={1200}
            height={600}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-black/60" />

          <div className="relative px-8 py-16 sm:px-14 sm:py-20">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-orange">
              Get started
            </p>
            <h2 className="mt-4 max-w-lg text-balance text-3xl font-bold text-white sm:text-5xl">
              Your first fraction is one click away.
            </h2>
            <p className="mt-4 max-w-md text-lg text-white/60">
              Browse live listings on DevNet, connect your Loop wallet, and
              claim test USDC to start investing today.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/marketplace"
                className="rounded-full bg-brand-orange px-8 py-3.5 text-base font-semibold text-white transition hover:bg-[#e55c00]"
              >
                Open marketplace
              </Link>
              <Link
                href="/wallet"
                className="rounded-full border border-white/25 px-8 py-3.5 text-base font-semibold text-white transition hover:border-white/50 hover:bg-white/5"
              >
                Claim test USDC
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
