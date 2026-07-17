/**
 * Upload a DAR to Canton via POST /v2/packages.
 * Usage: node --env-file=../../.env scripts/upload-dar.mjs [path-to-dar]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultDar = path.resolve(__dirname, '../../../daml/.daml/dist/rentyvest-devnet-0.1.0.dar');
const darPath = path.resolve(process.argv[2] ?? defaultDar);

const ledgerUrl = (process.env.CANTON_JSON_API_URL ?? '').replace(/\/$/, '');

async function getToken() {
  const form = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.CANTON_CLIENT_ID,
    client_secret: process.env.CANTON_CLIENT_SECRET,
    audience: process.env.CANTON_AUDIENCE,
    scope: process.env.CANTON_OAUTH_SCOPE ?? 'daml_ledger_api',
  });
  const res = await fetch(process.env.CANTON_OAUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`OAuth failed: ${JSON.stringify(body)}`);
  return body.access_token;
}

const token = await getToken();
const dar = fs.readFileSync(darPath);
console.log('Uploading', darPath, `(${dar.length} bytes)`);

const res = await fetch(`${ledgerUrl}/v2/packages`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/octet-stream',
  },
  body: dar,
});

const text = await res.text();
console.log('Status:', res.status);
console.log(text.slice(0, 800));

if (!res.ok) {
  process.exit(1);
}
