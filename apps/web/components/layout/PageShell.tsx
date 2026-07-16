import type { ReactNode } from 'react';
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
  return (
    <div className={`flex min-h-screen flex-col ${className}`}>
      <SiteHeader variant={headerVariant} />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
