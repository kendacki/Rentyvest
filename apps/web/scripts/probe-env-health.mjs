/**
 * Non-secret Canton OAuth env diagnostics.
 * Usage: node --env-file=../../.env scripts/probe-env-health.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../../.env');

const keys = [
  'CANTON_OAUTH_URL',
  'CANTON_CLIENT_ID',
  'CANTON_CLIENT_SECRET',
  'CANTON_AUDIENCE',
  'CANTON_OAUTH_SCOPE',
  'CANTON_JSON_API_URL',
  'DATABASE_URL',
];

function inspect(name, raw = '') {
  const trimmed = raw.trim();
  return {
    present: trimmed.length > 0,
    length: trimmed.length,
    quoted: /^["']/.test(raw) && /["']$/.test(trimmed),
    hasWhitespacePadding: raw !== trimmed,
    hasCarriageReturn: /\r/.test(raw),
    hasInternalWhitespace: /\s/.test(trimmed) && name !== 'DATABASE_URL',
    preview: trimmed
      ? `${trimmed.slice(0, 6)}…${trimmed.slice(-4)}`
      : '(empty)',
  };
}

const fileVars = {};
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) fileVars[match[1].trim()] = match[2];
  }
}

console.log('Canton OAuth env health (values redacted):\n');
for (const key of keys) {
  const fromFile = fileVars[key] ?? '';
  const fromProcess = process.env[key] ?? '';
  console.log(key);
  console.log('  file:   ', inspect(key, fromFile));
  console.log('  loaded: ', inspect(key, fromProcess));
  if (fromFile.trim() !== fromProcess.trim() && key !== 'DATABASE_URL') {
    console.log('  mismatch between .env file and --env-file loader');
  }
  console.log('');
}
