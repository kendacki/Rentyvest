/**
 * Probe submit-and-wait-for-transaction response shape.
 */
const ledgerUrl = (process.env.CANTON_JSON_API_URL ?? '').replace(/\/$/, '');
const pkg = process.env.CANTON_DAML_PACKAGE_ID;
const admin = process.env.CANTON_ACT_AS_PARTY;

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
const issuerRes = await fetch(`${ledgerUrl}/v2/state/active-contracts`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    filter: {
      filtersByParty: {
        [admin]: {
          cumulative: [{
            templateFilters: [{
              templateId: {
                packageId: pkg,
                moduleName: 'RentyVest.TestUSDC',
                entityName: 'USDCIssuer',
              },
              includeCreatedEventBlob: false,
            }],
          }],
        },
      },
    },
    verbose: true,
    activeAtOffset: String((await (await fetch(`${ledgerUrl}/v2/state/ledger-end`, { headers: { Authorization: `Bearer ${token}` } })).json()).offset),
  }),
});
const acs = await issuerRes.json();
const issuer = acs[0]?.contractEntry?.JsActiveContract?.createdEvent?.contractId;
console.log('issuer', issuer?.slice(0, 20));

const body = {
  commands: {
    actAs: [admin],
    readAs: [admin],
    userId: process.env.CANTON_LEDGER_USER_ID?.trim() || '6',
    commandId: `probe-tx-${Date.now()}`,
    commands: [{
      ExerciseCommand: {
        templateId: `${pkg}:RentyVest.TestUSDC:USDCIssuer`,
        contractId: issuer,
        choice: 'Mint',
        choiceArgument: { owner: admin, amount: '1.0', observers: [] },
      },
    }],
  },
};

const res = await fetch(`${ledgerUrl}/v2/commands/submit-and-wait-for-transaction`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
const text = await res.text();
console.log('status', res.status);
console.log(text.slice(0, 2500));
