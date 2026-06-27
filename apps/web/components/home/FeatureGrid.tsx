'use client';

import { motion } from 'framer-motion';
import { fadeUp, staggerContainer } from './motion';

function FractionIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="h-10 w-10" aria-hidden>
      <rect x="4" y="4" width="18" height="18" rx="3" fill="#FF6600" />
      <rect x="26" y="4" width="18" height="18" rx="3" fill="#FF6600" opacity="0.6" />
      <rect x="4" y="26" width="18" height="18" rx="3" fill="#FF6600" opacity="0.6" />
      <rect x="26" y="26" width="18" height="18" rx="3" fill="#FF6600" opacity="0.3" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="h-10 w-10" aria-hidden>
      <path
        d="M24 4L8 10v12c0 10.5 6.8 20.3 16 22 9.2-1.7 16-11.5 16-22V10L24 4z"
        fill="#FF6600"
        opacity="0.15"
        stroke="#FF6600"
        strokeWidth="2"
      />
      <path
        d="M18 24l4 4 8-8"
        stroke="#FF6600"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="h-10 w-10" aria-hidden>
      <rect
        x="6"
        y="12"
        width="36"
        height="28"
        rx="4"
        stroke="#FF6600"
        strokeWidth="2"
        fill="#FF6600"
        fillOpacity="0.1"
      />
      <circle cx="34" cy="26" r="4" fill="#FF6600" />
      <path d="M6 20h36" stroke="#FF6600" strokeWidth="2" />
    </svg>
  );
}

const features = [
  {
    icon: <FractionIcon />,
    title: 'Fractional ownership',
    body: 'Own a slice of premium property without buying the whole building. Start small, scale when you are ready.',
  },
  {
    icon: <ShieldIcon />,
    title: 'On-chain transparency',
    body: 'Every ownership record lives on Canton. Auditable, immutable, and always yours to verify.',
  },
  {
    icon: <WalletIcon />,
    title: 'Loop wallet ready',
    body: 'Connect with Loop, claim test USDC on DevNet, and transact in seconds. No friction, no guesswork.',
  },
];

export function FeatureGrid() {
  return (
    <section id="features" className="border-t border-white/5 bg-zinc-950 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          custom={0}
          className="mb-16 text-center"
        >
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-orange">
            Built for modern investors
          </p>
          <h2 className="mt-4 text-balance text-3xl font-bold text-white sm:text-5xl">
            Real estate, reimagined.
          </h2>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="grid gap-6 sm:grid-cols-3"
        >
          {features.map((f) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              custom={0}
              className="group rounded-2xl border border-white/8 bg-white/[0.03] p-8 transition hover:border-brand-orange/30 hover:bg-white/[0.05]"
            >
              <div className="mb-5 inline-flex rounded-xl bg-brand-orange/10 p-3">
                {f.icon}
              </div>
              <h3 className="text-xl font-semibold text-white">{f.title}</h3>
              <p className="mt-3 leading-relaxed text-white/55">{f.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
