/**
 * Smoke-test 5N M2M OAuth + ledger API connectivity.
 * Usage: node --env-file=../../.env scripts/probe-m2m.mjs
 */
const oauthUrl = process.env.CANTON_OAUTH_URL;
const clientId = process.env.CANTON_CLIENT_ID;
const clientSecret = process.env.CANTON_CLIENT_SECRET;
const audience = process.env.CANTON_AUDIENCE;
const scope = process.env.CANTON_OAUTH_SCOPE ?? 'daml_ledger_api';
const ledgerUrl = (process.env.CANTON_JSON_API_URL ?? '').replace(/\/$/, '');

if (!oauthUrl || !clientId || !clientSecret || !audience || !ledgerUrl) {
  console.error('Missing CANTON_OAUTH_* or CANTON_JSON_API_URL in env');
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
  console.log('OAuth:', tokenRes.status, tokenBody.slice(0, 300));

  if (!tokenRes.ok) {
    console.error(
      'M2M OAuth failed. Verify CANTON_CLIENT_ID, CANTON_CLIENT_SECRET, and CANTON_AUDIENCE with 5N Sandbox.',
    );
    process.exitCode = 1;
  } else {
    const { access_token: accessToken } = JSON.parse(tokenBody);
    if (!accessToken) {
      console.error('No access_token in OAuth response');
      process.exitCode = 1;
    } else {
      console.log('access_token acquired (length %d)', accessToken.length);

      const ledgerRes = await fetch(`${ledgerUrl}/v2/state/ledger-end`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const ledgerBody = await ledgerRes.text();
      console.log('Ledger:', ledgerRes.status, ledgerBody.slice(0, 300));
      process.exitCode = ledgerRes.ok ? 0 : 1;
    }
  }
}
