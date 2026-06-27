/**
 * Probe faucet Mint on Canton DevNet.
 * Usage: node --env-file=../../.env scripts/probe-mint.mjs [ownerPartyId]
 */
const oauthUrl = process.env.CANTON_OAUTH_URL;
const clientId = process.env.CANTON_CLIENT_ID;
const clientSecret = process.env.CANTON_CLIENT_SECRET;
const audience = process.env.CANTON_AUDIENCE;
const scope = process.env.CANTON_OAUTH_SCOPE ?? 'daml_ledger_api';
const ledgerUrl = (process.env.CANTON_JSON_API_URL ?? '').replace(/\/$/, '');
const pkg = process.env.CANTON_DAML_PACKAGE_ID;
const issuer = process.env.CANTON_USDC_ISSUER_CONTRACT_ID;
const adminParty =
  process.env.CANTON_ADMIN_PARTY_ID ??
  process.env.CANTON_ACT_AS_PARTY;
const ownerParty = process.argv[2] ?? adminParty;
const amount = process.env.FAUCET_USDC_AMOUNT ?? '100000.0';
const useJwt = process.argv.includes('--jwt');

let token;
if (useJwt) {
  token =
    process.env.CANTON_ADMIN_TOKEN?.trim() ||
    process.env.CANTON_LEDGER_TOKEN?.trim() ||
    process.env.CANTON_JWT?.trim();
  if (!token) {
    console.error('No CANTON_JWT / CANTON_ADMIN_TOKEN in env');
    process.exit(1);
  }
  console.log('Using CANTON_JWT (--jwt)');
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
  const tokenBody = await tokenRes.json();
  if (!tokenRes.ok) {
    console.error('OAuth failed', tokenRes.status, tokenBody);
    process.exit(1);
  }
  token = tokenBody.access_token;
  console.log('Using M2M OAuth token');
}

const templateId = `${pkg}:RentyVest.TestUSDC:USDCIssuer`;
const body = {
  actAs: [adminParty],
  readAs: [process.env.CANTON_READ_AS_PARTY ?? adminParty],
  userId: process.env.CANTON_LEDGER_USER_ID?.trim() || '6',
  commandId: `probe-mint-${Date.now()}`,
  commands: [
    {
      ExerciseCommand: {
        templateId,
        contractId: issuer,
        choice: 'Mint',
        choiceArgument: {
          owner: ownerParty,
          amount,
          observers: [],
        },
      },
    },
  ],
};

console.log('Mint probe:', { templateId, issuer, adminParty, ownerParty, amount });

const submitRes = await fetch(`${ledgerUrl}/v2/commands/submit-and-wait`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
});

const submitBody = await submitRes.text();
console.log('Submit:', submitRes.status, submitBody.slice(0, 1200));
process.exit(submitRes.ok ? 0 : 1);
