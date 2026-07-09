/**
 * Diagnose faucet mint failure for a Loop party.
 * Usage: node --env-file=../../.env scripts/diagnose-faucet-mint.mjs [partyId]
 */
const ledgerUrl = (process.env.CANTON_JSON_API_URL ?? '').replace(/\/$/, '');
const pkg = process.env.CANTON_DAML_PACKAGE_ID;
const admin = process.env.CANTON_ACT_AS_PARTY;
const ownerParty = process.argv[2];

if (!ownerParty) {
  console.error('Usage: node scripts/diagnose-faucet-mint.mjs <canton_party_id>');
  process.exit(1);
}

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
const ledgerEnd = await (
  await fetch(`${ledgerUrl}/v2/state/ledger-end`, {
    headers: { Authorization: `Bearer ${token}` },
  })
).json();

const acsRes = await fetch(`${ledgerUrl}/v2/state/active-contracts`, {
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
    activeAtOffset: String(ledgerEnd.offset),
  }),
});

const acs = await acsRes.json();
const issuer = acs[0]?.contractEntry?.JsActiveContract?.createdEvent?.contractId;
console.log('Owner party:', ownerParty);
console.log('Issuer:', issuer?.slice(0, 24) + '...');

const body = {
  commands: {
    actAs: [admin],
    readAs: [admin],
    userId: process.env.CANTON_LEDGER_USER_ID?.trim() || '6',
    commandId: `diag-mint-${Date.now()}`,
    commands: [{
      ExerciseCommand: {
        templateId: `${pkg}:RentyVest.TestUSDC:USDCIssuer`,
        contractId: issuer,
        choice: 'Mint',
        choiceArgument: {
          owner: ownerParty,
          amount: process.env.FAUCET_USDC_AMOUNT ?? '100000.0',
          observers: [],
        },
      },
    }],
  },
};

for (const path of ['/v2/commands/submit-and-wait-for-transaction', '/v2/commands/submit-and-wait']) {
  const res = await fetch(`${ledgerUrl}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(path.includes('for-transaction') ? body : body.commands),
  });
  const text = await res.text();
  console.log('\n---', path, '---');
  console.log('Status:', res.status);
  try {
    const parsed = JSON.parse(text);
    console.log('code:', parsed.code);
    console.log('cause:', (parsed.cause ?? text).slice(0, 600));
  } catch {
    console.log(text.slice(0, 600));
  }
}
