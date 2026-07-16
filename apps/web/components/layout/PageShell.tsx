'use client';

import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';

type PageShellProps = {
  children: ReactNode;
  headerVariant?: 'light' | 'dark';
  className?: string;
};

export function PageShell({
  children,
  headerVariant = 'light',
  className = '',
}: PageShellProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className={`flex min-h-screen flex-col ${className}`}>
      <SiteHeader variant={headerVariant} />
      <motion.div
        className="flex-1"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
      <SiteFooter />
    </div>
  );
}
