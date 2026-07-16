'use client';

import Lottie from 'lottie-react';
import { motion, useReducedMotion } from 'framer-motion';
import heroBlob from '../../assets/animations/hero-blob.json';

export function HeroBlob() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className="relative mx-auto aspect-square w-full max-w-md"
      initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
      aria-hidden
    >
      <Lottie
        animationData={heroBlob}
        loop
        className="h-full w-full"
        style={{ filter: 'saturate(1.15) contrast(1.05)' }}
      />
    </motion.div>
  );
}
