import Link from 'next/link';
import { PageShell } from '../components/layout/PageShell';

export default function NotFound() {
  return (
    <PageShell>
      <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-20 text-center sm:px-6">
        <p className="section-label">404</p>
        <h1 className="heading-section mt-3 text-brand-black">Page not found</h1>
        <p className="mt-4 text-neutral-600">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/" className="btn-primary">
            Back to home
          </Link>
          <Link href="/marketplace" className="btn-secondary">
            Browse marketplace
          </Link>
        </div>
      </main>
    </PageShell>
  );
}
