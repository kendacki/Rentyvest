'use client';

import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { fadeUp } from './motion';

const panels = [
  {
    tag: 'Own it',
    title: 'Buy fractions of real property.',
    body: 'Start with as little as you want. Every share is backed by on-chain ownership records on Canton — transparent, verifiable, yours.',
    image:
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=85&auto=format&fit=crop',
    alt: 'Luxury modern home interior',
  },
  {
    tag: 'Earn it',
    title: 'Rental income, distributed fairly.',
    body: 'When properties generate yield, your share of the rent flows back to you. No chasing landlords. No opaque statements.',
    image:
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=85&auto=format&fit=crop',
    alt: 'Bright apartment living space',
  },
  {
    tag: 'Trade it',
    title: 'Liquidity when you need it.',
    body: 'List your fractions on the marketplace. Exit positions on your timeline — not a decade-long lockup.',
    image:
      'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=1200&q=85&auto=format&fit=crop',
    alt: 'City skyline at dusk',
  },
];

function ShowcasePanel({
  panel,
  index,
}: {
  panel: (typeof panels)[0];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], [40, -40]);
  const reversed = index % 2 === 1;

  return (
    <motion.div
      ref={ref}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      custom={0}
      className={`flex flex-col items-center gap-10 lg:flex-row lg:gap-16 ${
        reversed ? 'lg:flex-row-reverse' : ''
      }`}
    >
      <div className="flex-1 text-center lg:text-left">
        <span className="text-sm font-semibold uppercase tracking-[0.15em] text-brand-orange">
          {panel.tag}
        </span>
        <h3 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {panel.title}
        </h3>
        <p className="mt-4 text-lg leading-relaxed text-white/55">{panel.body}</p>
      </div>

      <motion.div style={{ y }} className="relative flex-1">
        <div className="absolute -inset-3 rounded-2xl bg-brand-orange/10 blur-2xl" />
        <div className="relative overflow-hidden rounded-2xl border border-white/10">
          <Image
            src={panel.image}
            alt={panel.alt}
            width={1200}
            height={800}
            className="aspect-[4/3] w-full object-cover"
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

export function ScrollShowcase() {
  return (
    <section id="how-it-works" className="bg-black py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          custom={0}
          className="mb-20 text-center"
        >
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-orange">
            Simple by design
          </p>
          <h2 className="mt-4 text-balance text-3xl font-bold text-white sm:text-5xl">
            Invest. Earn. Exit.
            <br />
            All in one place.
          </h2>
        </motion.div>

        <div className="space-y-28 sm:space-y-36">
          {panels.map((panel, i) => (
            <ShowcasePanel key={panel.tag} panel={panel} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
