/**
 * Inspect M2M token rights and search for USDCIssuer on ledger.
 */
const ledgerUrl = (process.env.CANTON_JSON_API_URL ?? '').replace(/\/$/, '');
const pkg = process.env.CANTON_DAML_PACKAGE_ID;
const issuer = process.env.CANTON_USDC_ISSUER_CONTRACT_ID;

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
  if (!res.ok) throw new Error(`OAuth ${res.status}: ${JSON.stringify(body)}`);
  return body.access_token;
}

function decodeJwt(token) {
  const payload = token.split('.')[1];
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
}

const token = await getToken();
const claims = decodeJwt(token);
console.log('JWT claims (subset):', {
  sub: claims.sub,
  aud: claims.aud,
  scope: claims.scope,
  exp: claims.exp,
  ledger_api_right: claims['https://daml.com/ledger-api'],
});

const userId = claims.sub ?? '6';
const rightsRes = await fetch(`${ledgerUrl}/v2/users/${userId}/rights`, {
  headers: { Authorization: `Bearer ${token}` },
});
const rightsText = await rightsRes.text();
console.log('\nGET /v2/users/{id}/rights:', rightsRes.status, rightsText.slice(0, 1500));

// Try to fetch configured issuer contract
if (issuer) {
  const eventsRes = await fetch(`${ledgerUrl}/v2/events/event-by-contract-id`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ contractId: issuer }),
  });
  const eventsText = await eventsRes.text();
  console.log('\nIssuer contract lookup:', eventsRes.status, eventsText.slice(0, 800));
}

// ACS query for USDCIssuer template using first CanActAs party
const rights = JSON.parse(rightsText).rights ?? [];
const actAsParties = rights
  .filter((r) => r.kind?.CanActAs)
  .map((r) => r.kind.CanActAs.value.party);
const readAsParties = rights
  .filter((r) => r.kind?.CanReadAs)
  .map((r) => r.kind.CanReadAs.value.party);
console.log('\nCanActAs parties (first 10):', actAsParties.slice(0, 10));

const queryParty = actAsParties[0];
if (!queryParty) {
  console.error('No CanActAs parties on M2M user');
  process.exit(1);
}

const templateId = `${pkg}:RentyVest.TestUSDC:USDCIssuer`;
const filtersByParty = {};
for (const p of [...new Set([...actAsParties, ...readAsParties])].slice(0, 20)) {
  filtersByParty[p] = {
    cumulative: [
      {
        templateFilters: [{ templateId, includeCreatedEventBlob: false }],
      },
    ],
  };
}

const ledgerEndRes = await fetch(`${ledgerUrl}/v2/state/ledger-end`, {
  headers: { Authorization: `Bearer ${token}` },
});
const { offset } = await ledgerEndRes.json();

const acsRes = await fetch(`${ledgerUrl}/v2/state/active-contracts`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    filter: { filtersByParty },
    verbose: true,
    activeAtOffset: String(offset),
  }),
});
const acsText = await acsRes.text();
console.log('\nACS USDCIssuer query:', acsRes.status);
if (acsRes.ok) {
  const acs = JSON.parse(acsText);
  console.log('USDCIssuer contracts found:', acs.length);
  for (const entry of acs.slice(0, 5)) {
    const created = entry.contractEntry?.JsActiveContract?.createdEvent;
    if (created) {
      console.log(' -', created.contractId, 'admin:', created.createArgument?.platform_admin);
    }
  }
} else {
  console.log(acsText.slice(0, 1000));
}

// Also search Asset template for any tUSDC holdings
const assetTemplate = `${pkg}:RentyVest.TestUSDC:Asset`;
const assetFilters = {};
for (const p of actAsParties.slice(0, 5)) {
  assetFilters[p] = {
    cumulative: [{ templateFilters: [{ templateId: assetTemplate, includeCreatedEventBlob: false }] }],
  };
}
const assetRes = await fetch(`${ledgerUrl}/v2/state/active-contracts`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    filter: { filtersByParty: assetFilters },
    verbose: false,
    activeAtOffset: String(offset),
  }),
});
const assetText = await assetRes.text();
if (assetRes.ok) {
  const assets = JSON.parse(assetText);
  console.log('\nAsset contracts (sample parties):', assets.length);
} else {
  console.log('\nAsset query failed:', assetRes.status, assetText.slice(0, 300));
}
