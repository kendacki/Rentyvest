/**
 * Find USDCIssuer contracts for configured package.
 * Usage: node --env-file=../../.env scripts/find-faucet-issuer.mjs
 */
const ledgerUrl = (process.env.CANTON_JSON_API_URL ?? '').replace(/\/$/, '');
const pkg = process.env.CANTON_DAML_PACKAGE_ID;
const party = process.env.CANTON_ACT_AS_PARTY;

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
  return (await res.json()).access_token;
}

const token = await getToken();
const ledgerEndRes = await fetch(`${ledgerUrl}/v2/state/ledger-end`, {
  headers: { Authorization: `Bearer ${token}` },
});
const { offset } = await ledgerEndRes.json();

const acsRes = await fetch(`${ledgerUrl}/v2/state/active-contracts`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    filter: {
      filtersByParty: {
        [party]: { cumulative: [{ templateFilters: [] }] },
      },
    },
    verbose: true,
    activeAtOffset: String(offset),
  }),
});

const acs = await acsRes.json();
const matches = [];

for (const entry of acs) {
  const ev = entry.contractEntry?.JsActiveContract?.createdEvent;
  if (!ev) continue;

  const tid =
    typeof ev.templateId === 'string'
      ? ev.templateId
      : `${ev.templateId.packageId}:${ev.templateId.moduleName}:${ev.templateId.entityName}`;

  if (!tid.includes('USDCIssuer')) continue;
  if (pkg && !tid.startsWith(`${pkg}:`)) continue;

  matches.push({
    contractId: ev.contractId,
    templateId: tid,
    platform_admin: ev.createArgument?.platform_admin,
  });
}

console.log('Package:', pkg);
console.log('USDCIssuer matches:', matches.length);
for (const match of matches) {
  console.log(JSON.stringify(match));
}
