/**
 * Fetch a live Canton ledger token via M2M OAuth and update root .env.
 * Usage: node --env-file=../../.env scripts/fetch-canton-jwt.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../../.env');

const oauthUrl = process.env.CANTON_OAUTH_URL;
const clientId = process.env.CANTON_CLIENT_ID;
const clientSecret = process.env.CANTON_CLIENT_SECRET;
const audience = process.env.CANTON_AUDIENCE;
const scope = process.env.CANTON_OAUTH_SCOPE ?? 'daml_ledger_api';
const ledgerUrl = (process.env.CANTON_JSON_API_URL ?? '').replace(/\/$/, '');

if (!oauthUrl || !clientId || !clientSecret || !audience || !ledgerUrl) {
  console.error('Missing CANTON_OAUTH_* or CANTON_JSON_API_URL');
  process.exitCode = 1;
} else {
  const form = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    audience,
    scope,
  });

  const tokenRes = await fetch(oauthUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });

  const tokenBody = await tokenRes.text();
  console.log('OAuth:', tokenRes.status, tokenBody.slice(0, 200));

  if (!tokenRes.ok) {
    console.error('Cannot refresh CANTON_JWT — M2M OAuth failed.');
    process.exitCode = 1;
  } else {
    const { access_token: accessToken } = JSON.parse(tokenBody);
    if (!accessToken) {
      console.error('OAuth response missing access_token');
      process.exitCode = 1;
    } else {
      const ledgerRes = await fetch(`${ledgerUrl}/v2/state/ledger-end`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const ledgerBody = await ledgerRes.text();
      console.log('Ledger:', ledgerRes.status, ledgerBody.slice(0, 200));

      if (!ledgerRes.ok) {
        console.error('Fetched token rejected by ledger API');
        process.exitCode = 1;
      } else if (!fs.existsSync(envPath)) {
        console.error('Root .env not found at', envPath);
        process.exitCode = 1;
      } else {
        const envText = fs.readFileSync(envPath, 'utf8');
        const jwtLine = `CANTON_JWT=${accessToken}`;
        const updated = /^CANTON_JWT=.*$/m.test(envText)
          ? envText.replace(/^CANTON_JWT=.*$/m, jwtLine)
          : `${envText.trimEnd()}\n${jwtLine}\n`;

        fs.writeFileSync(envPath, updated, 'utf8');
        console.log('Updated CANTON_JWT in .env (length %d)', accessToken.length);
        process.exitCode = 0;
      }
    }
  }
}
