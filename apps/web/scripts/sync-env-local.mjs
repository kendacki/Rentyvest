/**
 * Copy NEXT_PUBLIC_* variables into apps/web/.env.local for Next.js inlining.
 *
 * Local: reads from repo root `.env`
 * CI/Vercel: reads from process.env (Vercel project variables)
 *
 * Usage: node scripts/sync-env-local.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(webRoot, '../..');
const sourcePath = path.join(repoRoot, '.env');
const targetPath = path.join(webRoot, '.env.local');

const isCi =
  process.env.CI === 'true' ||
  process.env.CI === '1' ||
  Boolean(process.env.VERCEL);

const header = [
  '# Auto-generated — do not commit.',
  '# Synced by scripts/sync-env-local.mjs',
  '# Regenerate: pnpm --filter web sync-env',
  '',
];

function writeEnvLocal(lines, sourceLabel) {
  fs.writeFileSync(targetPath, [...header, ...lines, ''].join('\n'), 'utf8');
  console.log(
    `[sync-env-local] Wrote ${path.relative(process.cwd(), targetPath)} (${lines.length} NEXT_PUBLIC_* vars from ${sourceLabel})`,
  );
}

function linesFromProcessEnv() {
  return Object.entries(process.env)
    .filter(([key]) => key.startsWith('NEXT_PUBLIC_'))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value ?? ''}`);
}

function linesFromRootEnvFile() {
  const sourceLines = fs.readFileSync(sourcePath, 'utf8').split(/\r?\n/);
  return sourceLines.filter((line) => /^NEXT_PUBLIC_/.test(line.trim()));
}

if (fs.existsSync(sourcePath)) {
  const publicLines = linesFromRootEnvFile();

  if (publicLines.length === 0) {
    console.warn('[sync-env-local] No NEXT_PUBLIC_* entries found in root .env.');
  }

  writeEnvLocal(publicLines, 'repo root .env');
  process.exit(0);
}

if (isCi) {
  const publicLines = linesFromProcessEnv();

  if (publicLines.length === 0) {
    console.warn(
      '[sync-env-local] CI/Vercel: no NEXT_PUBLIC_* variables in environment; skipping .env.local write.',
    );
    console.warn(
      '[sync-env-local] Add NEXT_PUBLIC_* vars in Vercel Project Settings → Environment Variables.',
    );
    process.exit(0);
  }

  writeEnvLocal(publicLines, 'CI environment');
  process.exit(0);
}

console.error(
  '[sync-env-local] Root .env not found at',
  sourcePath,
  '\nCopy .env.example to .env at the repo root, then retry.',
);
process.exit(1);
