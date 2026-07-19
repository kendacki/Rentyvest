import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nextEnv from '@next/env';

const { loadEnvConfig } = nextEnv;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

loadEnvConfig(repoRoot);

// core-api uses PORT=8080; Next.js must keep its default (3000).
delete process.env.PORT;

function normalizeCoreApiUrl(raw) {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) {
    return 'http://localhost:8080';
  }

  const withProtocol =
    trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `https://${trimmed}`;

  return withProtocol.replace(/\/$/, '');
}

const coreApiUrl = normalizeCoreApiUrl(
  process.env.NEXT_PUBLIC_CORE_API_URL ?? process.env.NEXT_PUBLIC_API_URL,
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@rentyvest/ledger-client'],
  async rewrites() {
    // afterFiles: local Next.js routes (e.g. /listing-images) win first.
    // Only proxy unmatched /api/* paths to core-api.
    return {
      afterFiles: [
        {
          source: '/faucet/:path*',
          destination: `${coreApiUrl}/faucet/:path*`,
        },
        {
          source: '/api/:path*',
          destination: `${coreApiUrl}/api/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
