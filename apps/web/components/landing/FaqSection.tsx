'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Reveal } from '../motion/Reveal';

const FAQS = [
  {
    question: 'What exactly is RentyVest?',
    answer:
      'A fractional real estate platform on Canton Network. You browse property pools, pledge test USDC per slot, and receive on chain PropertyNFTs that represent your equity stake.',
  },
  {
    question: 'What wallet do I need?',
    answer:
      'Any CIP 103 compatible Canton wallet. Connect through WalletConnect on the sandbox network, then claim test USDC from our faucet before making your first pledge.',
  },
  {
    question: 'How does a property pool work?',
    answer:
      'Each property is divided into fixed slots at a set price. When you pledge, tUSDC settles on Canton and a PropertyNFT is minted to your party. Fill progress updates in real time.',
  },
  {
    question: 'Is this real money?',
    answer:
      'No. RentyVest runs on Canton Dev Net with test USDC (tUSDC). This is a demonstration environment, not a regulated investment product.',
  },
  {
    question: 'Can I sell or transfer my stake?',
    answer:
      'Yes. From your portfolio, transfer a PropertyNFT to another Canton party. Transfers and future yield claims are wallet signed ledger actions.',
  },
] as const;

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center">
          <p className="section-label">FAQ</p>
          <h2 className="heading-section mt-4 text-black">
            Everything you need to know before your first pledge
          </h2>
        </Reveal>

        <Reveal className="card-surface mt-14 divide-y divide-white/40 px-6 sm:px-8" delay={0.1}>
          {FAQS.map(({ question, answer }, index) => {
            const isOpen = openIndex === index;

            return (
              <div key={question}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 py-6 text-left"
                  aria-expanded={isOpen}
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                >
                  <span className="font-semibold text-black">{question}</span>
                  <motion.span
                    className="shrink-0 text-2xl font-light text-brand-orange"
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.25 }}
                    aria-hidden
                  >
                    +
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <motion.p
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden pb-6 text-sm leading-relaxed text-neutral-600"
                    >
                      {answer}
                    </motion.p>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}

export function CtaSection() {
  return (
    <Reveal as="section" className="bg-brand-orange px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="heading-section text-white">
          Your first slot is one pledge away
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/90">
          Connect via WalletConnect, grab test USDC from the faucet, and explore
          live property pools on Canton Dev Net with no minimum beyond a single
          slot.
        </p>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/marketplace" className="btn-inverse">
            Browse marketplace
          </Link>
          <Link href="/wallet" className="btn-outline-light border-white/80">
            Get test USDC
          </Link>
        </div>
      </div>
    </Reveal>
  );
}
