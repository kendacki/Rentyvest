import type { Metadata } from 'next';
import { AppProviders } from '../components/providers/AppProviders';
import './globals.css';

export const metadata: Metadata = {
  title: 'RentyVest — Fractional real estate on Canton',
  description:
    'Own premium property one fraction at a time. Invest, earn rental yield, and trade on-chain with RentyVest on Canton DevNet.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-white antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
