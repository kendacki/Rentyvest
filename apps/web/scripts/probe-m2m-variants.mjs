/**
 * Try common OAuth parameter variants for 5N sandbox M2M.
 * Usage: node --env-file=../../.env scripts/probe-m2m-variants.mjs
 */
const oauthUrl = process.env.CANTON_OAUTH_URL;
const clientId = process.env.CANTON_CLIENT_ID;
const clientSecret = process.env.CANTON_CLIENT_SECRET;
const audience = process.env.CANTON_AUDIENCE;
const scope = process.env.CANTON_OAUTH_SCOPE ?? 'daml_ledger_api';

const variants = [
  {
    name: 'client_credentials + audience + scope',
    body: {
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      audience,
      scope,
    },
  },
  {
    name: 'client_credentials + scope only',
    body: {
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope,
    },
  },
  {
    name: 'client_credentials + audience only',
    body: {
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      audience,
    },
  },
  {
    name: 'client_credentials only',
    body: {
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    },
  },
  {
    name: 'audience = ledger API URL',
    body: {
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      audience: process.env.CANTON_JSON_API_URL,
      scope,
    },
  },
];

for (const variant of variants) {
  const form = new URLSearchParams(variant.body);
  const res = await fetch(oauthUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  const text = await res.text();
  console.log(`\n=== ${variant.name} ===`);
  console.log(res.status, text.slice(0, 400));
}
