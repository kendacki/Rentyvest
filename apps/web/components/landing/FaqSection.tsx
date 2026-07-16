'use client';

import Link from 'next/link';
import { useState } from 'react';

const FAQS = [
  {
    question: 'What is RentyVest?',
    answer:
      'RentyVest is a fractional real estate platform on Canton Network. Investors browse property pools, pledge test USDC per slot, and receive on-chain equity NFTs representing their stake.',
  },
  {
    question: 'Do I need a Canton wallet?',
    answer:
      'Yes. Connect via WalletConnect on the Canton sandbox network. Visit the Wallet page to pair your wallet and claim test USDC from the faucet before pledging.',
  },
  {
    question: 'How do property pools work?',
    answer:
      'Each property is split into a fixed number of slots at a set price. When you pledge, your payment is settled on Canton and a PropertyNFT is minted to your party. Pool progress updates in real time.',
  },
  {
    question: 'Is this real money?',
    answer:
      'No — RentyVest currently runs on Canton DevNet with test USDC (tUSDC). This is a demonstration environment, not a production investment product.',
  },
  {
    question: 'Can I transfer my equity NFT?',
    answer:
      'Yes. From your Portfolio dashboard, select an equity NFT and transfer it to another Canton party. Yield claims and transfers are wallet-signed ledger actions.',
  },
] as const;

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="section-label">FAQs</p>
          <h2 className="heading-section mt-3 text-brand-black">
            Questions? We&apos;ve got answers.
          </h2>
        </div>

        <div className="mt-12 divide-y divide-neutral-200 border-y border-neutral-200">
          {FAQS.map(({ question, answer }, index) => {
            const isOpen = openIndex === index;

            return (
              <div key={question}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 py-5 text-left"
                  aria-expanded={isOpen}
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                >
                  <span className="font-semibold text-brand-black">
                    {question}
                  </span>
                  <span
                    className={`text-xl text-brand-orange transition-transform ${
                      isOpen ? 'rotate-45' : ''
                    }`}
                    aria-hidden
                  >
                    +
                  </span>
                </button>
                {isOpen ? (
                  <p className="pb-5 text-sm leading-relaxed text-neutral-600">
                    {answer}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function CtaSection() {
  return (
    <section className="bg-brand-orange px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="heading-section text-white">
          Ready to explore fractional real estate?
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-orange-100">
          Connect your wallet, claim test USDC, and browse live property pools
          on Canton DevNet.
        </p>
        <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
          <Link href="/marketplace" className="btn-inverse">
            Browse marketplace
          </Link>
          <Link
            href="/wallet"
            className="inline-flex h-12 items-center justify-center rounded-full border-2 border-white px-6 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            Get test USDC
          </Link>
        </div>
      </div>
    </section>
  );
}
