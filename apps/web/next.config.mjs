import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nextEnv from '@next/env';

const { loadEnvConfig } = nextEnv;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

loadEnvConfig(repoRoot);

// core-api uses PORT=8080; Next.js must keep its default (3000).
delete process.env.PORT;

const coreApiUrl = (
  process.env.NEXT_PUBLIC_CORE_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:8080'
).replace(/\/$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/faucet/:path*',
        destination: `${coreApiUrl}/faucet/:path*`,
      },
    ];
  },
};

export default nextConfig;
