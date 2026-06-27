import { Ledger } from '@c7/ledger';

const token = process.env.CANTON_JWT ?? process.env.CANTON_LEDGER_TOKEN;
const baseUrl = (process.env.NEXT_PUBLIC_CANTON_LEDGER_URL ?? '').replace(/\/$/, '');

if (!token || !baseUrl) {
  console.error('Set CANTON_JWT (or CANTON_LEDGER_TOKEN) and NEXT_PUBLIC_CANTON_LEDGER_URL');
  process.exit(1);
}

console.log('Ledger URL:', baseUrl);

const health = await fetch(`${baseUrl}/v2/state/ledger-end`, {
  headers: { Authorization: `Bearer ${token}` },
});
const healthBody = await health.text();
console.log('GET /v2/state/ledger-end:', health.status, healthBody.slice(0, 200));

if (!health.ok) {
  console.error(
    '\nLedger auth failed. Seaport/5N expects an OIDC ledger token (JWT with `sub` + `daml_ledger_api` scope), not only `party_id`.',
  );
  process.exit(1);
}

const ledger = new Ledger({ token, httpBaseUrl: baseUrl });

try {
  const parties = await ledger.getTokenActAsParties();
  console.log('actAs parties:', parties);
  const user = await ledger.getTokenUserInfo();
  console.log('user:', user);
} catch (error) {
  console.error('ledger probe failed:', error);
  process.exit(1);
}
