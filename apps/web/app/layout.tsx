import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AppProviders } from '../components/providers/AppProviders';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'RentyVest | Fractional Real Estate on Canton',
  description:
    'Browse property pools, pledge per-slot with test USDC, and hold on-chain equity NFTs on Canton Network.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen font-sans antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
