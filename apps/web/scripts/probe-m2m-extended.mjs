/**
 * Extended OAuth probe: Basic auth, alternate URLs, resource param.
 * Usage: node --env-file=../../.env scripts/probe-m2m-extended.mjs
 */
const clientId = process.env.CANTON_CLIENT_ID;
const clientSecret = process.env.CANTON_CLIENT_SECRET;
const audience = process.env.CANTON_AUDIENCE;
const scope = process.env.CANTON_OAUTH_SCOPE ?? 'daml_ledger_api';
const ledgerUrl = (process.env.CANTON_JSON_API_URL ?? '').replace(/\/$/, '');

const oauthUrls = [
  process.env.CANTON_OAUTH_URL,
  'https://auth.sandbox.fivenorth.io/application/o/token/',
  'https://auth.sandbox.fivenorth.io/application/o/token',
  'https://auth.sandbox.fivenorth.io/oauth2/token/',
].filter(Boolean);

const variants = [];

for (const url of oauthUrls) {
  variants.push({
    name: `${url} — form body (audience+scope)`,
    url,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      audience,
      scope,
    }).toString(),
  });

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  variants.push({
    name: `${url} — Basic auth header`,
    url,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      audience,
      scope,
    }).toString(),
  });

  variants.push({
    name: `${url} — resource=${ledgerUrl}`,
    url,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      resource: ledgerUrl,
      scope,
    }).toString(),
  });
}

for (const variant of variants) {
  try {
    const res = await fetch(variant.url, {
      method: 'POST',
      headers: variant.headers,
      body: variant.body,
    });
    const text = await res.text();
    const ok = res.ok ? 'OK' : 'FAIL';
    console.log(`\n=== [${ok}] ${variant.name} ===`);
    console.log(res.status, text.slice(0, 400));
    if (res.ok) {
      const { access_token: token } = JSON.parse(text);
      if (token) {
        const ledgerRes = await fetch(`${ledgerUrl}/v2/state/ledger-end`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const ledgerBody = await ledgerRes.text();
        console.log('Ledger:', ledgerRes.status, ledgerBody.slice(0, 200));
      }
    }
  } catch (err) {
    console.log(`\n=== [ERR] ${variant.name} ===`);
    console.log(err.message);
  }
}
