'use client';

import { motion } from 'framer-motion';
import { fadeUp } from './motion';

const chains = [
  { name: 'Canton', label: 'Ledger' },
  { name: 'Loop', label: 'Wallet' },
  { name: 'USDC', label: 'Stablecoin' },
  { name: 'DAML', label: 'Smart contracts' },
  { name: 'Seaport', label: 'Marketplace' },
  { name: 'DevNet', label: 'Sandbox' },
];

function CantonMark() {
  return (
    <svg viewBox="0 0 40 40" className="h-8 w-8" aria-hidden>
      <circle cx="20" cy="20" r="18" stroke="#FF6600" strokeWidth="2" fill="none" />
      <path
        d="M12 20h16M20 12v16"
        stroke="#FF6600"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ChainSection() {
  return (
    <section className="overflow-hidden bg-black py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
          >
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-orange">
              Powered by Canton
            </p>
            <h2 className="mt-4 text-balance text-3xl font-bold text-white sm:text-5xl">
              Fast, transparent,
              <br />
              globally composable.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-white/55">
              RentyVest settles ownership on Canton — a privacy-preserving
              ledger built for regulated finance. Your fractions, your wallet,
              your proof. Always on-chain.
            </p>
            <div className="mt-8 flex items-center gap-3 text-white/70">
              <CantonMark />
              <span className="text-sm font-medium">
                Canton Network · DevNet live today
              </span>
            </div>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={1}
            className="relative"
          >
            <div className="absolute inset-0 rounded-3xl bg-brand-orange/10 blur-3xl" />
            <div className="relative rounded-2xl border border-white/10 bg-zinc-950 p-8">
              <p className="mb-6 text-center text-sm font-medium uppercase tracking-widest text-white/40">
                Stack
              </p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {chains.map((c, i) => (
                  <motion.div
                    key={c.name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08, duration: 0.4 }}
                    className="flex flex-col items-center rounded-xl border border-white/8 bg-white/[0.03] px-4 py-5 text-center"
                  >
                    <span className="text-base font-bold text-white">{c.name}</span>
                    <span className="mt-1 text-xs text-white/40">{c.label}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
