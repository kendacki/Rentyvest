/**
 * Find RentyVest USDCIssuer contracts on ledger (one party at a time).
 */
const ledgerUrl = (process.env.CANTON_JSON_API_URL ?? '').replace(/\/$/, '');
const pkg = process.env.CANTON_DAML_PACKAGE_ID;
const templateId = `${pkg}:RentyVest.TestUSDC:USDCIssuer`;

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
  if (!res.ok) throw new Error(`OAuth ${res.status}`);
  return body.access_token;
}

const token = await getToken();
const rightsRes = await fetch(`${ledgerUrl}/v2/users/6/rights`, {
  headers: { Authorization: `Bearer ${token}` },
});
const { rights } = await rightsRes.json();
const actAsParties = rights
  .filter((r) => r.kind?.CanActAs)
  .map((r) => r.kind.CanActAs.value.party);

const ledgerEndRes = await fetch(`${ledgerUrl}/v2/state/ledger-end`, {
  headers: { Authorization: `Bearer ${token}` },
});
const { offset } = await ledgerEndRes.json();

const configuredAdmin =
  process.env.CANTON_ADMIN_PARTY_ID ?? process.env.CANTON_ACT_AS_PARTY;
const configuredIssuer = process.env.CANTON_USDC_ISSUER_CONTRACT_ID;

console.log('Configured admin:', configuredAdmin);
console.log('Configured issuer:', configuredIssuer?.slice(0, 40) + '...');
console.log('Package:', pkg);
console.log('M2M can act as configured admin?', actAsParties.includes(configuredAdmin));

let found = [];
for (const party of actAsParties) {
  const acsRes = await fetch(`${ledgerUrl}/v2/state/active-contracts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filter: {
        filtersByParty: {
          [party]: {
            cumulative: [{ templateFilters: [{ templateId, includeCreatedEventBlob: false }] }],
          },
        },
      },
      verbose: true,
      activeAtOffset: String(offset),
    }),
  });
  if (!acsRes.ok) continue;
  const acs = await acsRes.json();
  for (const entry of acs) {
    const created = entry.contractEntry?.JsActiveContract?.createdEvent;
    if (created) {
      found.push({
        contractId: created.contractId,
        platform_admin: created.createArgument?.platform_admin,
        party,
      });
    }
  }
}

console.log('\nRentyVest USDCIssuer contracts visible to M2M actAs parties:', found.length);
for (const f of found.slice(0, 10)) {
  console.log(' issuer:', f.contractId.slice(0, 50) + '...');
  console.log(' admin:', f.platform_admin);
  console.log(' via actAs:', f.party);
  console.log(' admin matches actAs?', f.platform_admin === f.party);
  console.log('');
}

if (found.length === 0) {
  console.log('No RentyVest USDCIssuer found — need make deploy-contracts on 5N sandbox.');
  process.exit(1);
}

const usable = found.filter((f) => f.platform_admin === f.party);
if (usable.length > 0) {
  console.log('RECOMMENDED env update:');
  console.log('CANTON_ACT_AS_PARTY=' + usable[0].platform_admin);
  console.log('CANTON_ADMIN_PARTY_ID=' + usable[0].platform_admin);
  console.log('CANTON_READ_AS_PARTY=' + usable[0].platform_admin);
  console.log('CANTON_USDC_ISSUER_CONTRACT_ID=' + usable[0].contractId);
}
