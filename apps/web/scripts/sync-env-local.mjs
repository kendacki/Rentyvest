/**
 * Copy NEXT_PUBLIC_* variables from the repo root .env into apps/web/.env.local.
 * Next.js inlines these at build/dev time from files in the app directory.
 *
 * Usage: node scripts/sync-env-local.mjs
 *        npm run sync-env
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(webRoot, '../..');
const sourcePath = path.join(repoRoot, '.env');
const targetPath = path.join(webRoot, '.env.local');

if (!fs.existsSync(sourcePath)) {
  console.error(
    '[sync-env-local] Root .env not found at',
    sourcePath,
    '\nCopy .env.example to .env at the repo root, then retry.',
  );
  process.exit(1);
}

const sourceLines = fs.readFileSync(sourcePath, 'utf8').split(/\r?\n/);
const publicLines = sourceLines.filter((line) => /^NEXT_PUBLIC_/.test(line.trim()));

if (publicLines.length === 0) {
  console.warn(
    '[sync-env-local] No NEXT_PUBLIC_* entries found in root .env.',
  );
}

const header = [
  '# Auto-generated — do not commit.',
  '# Synced from repo root .env by scripts/sync-env-local.mjs',
  '# Regenerate: npm run sync-env  (runs automatically before dev/build)',
  '',
];

fs.writeFileSync(
  targetPath,
  [...header, ...publicLines, ''].join('\n'),
  'utf8',
);

console.log(
  `[sync-env-local] Wrote ${path.relative(process.cwd(), targetPath)} (${publicLines.length} NEXT_PUBLIC_* vars)`,
);
