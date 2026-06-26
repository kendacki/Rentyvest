import type { Metadata } from 'next';
import { AppProviders } from '../components/providers/AppProviders';
import './globals.css';

export const metadata: Metadata = {
  title: 'RentyVest',
  description: 'Fractional real estate on Canton DevNet',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
