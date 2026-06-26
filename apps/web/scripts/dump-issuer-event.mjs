const ledgerUrl = (process.env.CANTON_JSON_API_URL ?? '').replace(/\/$/, '');
const pkg = process.env.CANTON_DAML_PACKAGE_ID;
const templateId = `${pkg}:RentyVest.TestUSDC:USDCIssuer`;
const party = process.argv[2] ?? 'out-mqdl789t::1220a14ca128063b8dc9d1ebb0bd22633be9f2168500f4dbc1ecaeb1855b14e5acf8';

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
        [party]: {
          cumulative: [{ templateFilters: [{ templateId, includeCreatedEventBlob: false }] }],
        },
      },
    },
    verbose: true,
    activeAtOffset: String(offset),
  }),
});
const acs = await acsRes.json();
console.log('count', acs.length);
const created = acs[0]?.contractEntry?.JsActiveContract?.createdEvent;
console.log(JSON.stringify(created, null, 2).slice(0, 3000));
