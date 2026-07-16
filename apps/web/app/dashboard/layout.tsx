import type { ReactNode } from 'react';

export const metadata = {
  title: 'Dashboard | RentyVest',
  description: 'View your fractional real estate equity and pending yield.',
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen page-canvas">
      {children}
    </div>
  );
}
