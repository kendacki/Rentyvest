/**
 * Bootstrap USDCIssuer on 5N sandbox if missing; update root .env.
 * Usage: node --env-file=../../.env scripts/bootstrap-faucet-issuer.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../../.env');

const ledgerUrl = (process.env.CANTON_JSON_API_URL ?? '').replace(/\/$/, '');
const pkg = process.env.CANTON_DAML_PACKAGE_ID;
const issuerTemplate = `${pkg}:RentyVest.TestUSDC:USDCIssuer`;

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
  if (!res.ok) throw new Error(`OAuth failed: ${JSON.stringify(body)}`);
  return body.access_token;
}

async function getActAsParties(token) {
  const rightsRes = await fetch(`${ledgerUrl}/v2/users/6/rights`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const { rights } = await rightsRes.json();
  return rights
    .filter((r) => r.kind?.CanActAs)
    .map((r) => r.kind.CanActAs.value.party);
}

function templateMatches(templateId, suffix) {
  if (typeof templateId === 'string') return templateId.endsWith(suffix);
  if (templateId?.moduleName && templateId?.entityName) {
    return `${templateId.moduleName}:${templateId.entityName}` === suffix;
  }
  return false;
}

async function findIssuer(token, parties) {
  const ledgerEndRes = await fetch(`${ledgerUrl}/v2/state/ledger-end`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const { offset } = await ledgerEndRes.json();
  const suffix = 'RentyVest.TestUSDC:USDCIssuer';

  for (const party of parties) {
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
    if (!acsRes.ok) continue;
    const acs = await acsRes.json();
    for (const entry of acs) {
      const ev = entry.contractEntry?.JsActiveContract?.createdEvent;
      if (!ev || !templateMatches(ev.templateId, suffix)) continue;
      const tid =
        typeof ev.templateId === 'string'
          ? ev.templateId
          : `${ev.templateId.packageId}:${ev.templateId.moduleName}:${ev.templateId.entityName}`;
      if (!tid.startsWith(`${pkg}:`)) continue;
      const admin = ev.createArgument?.platform_admin ?? ev.signatories?.[0];
      if (admin && parties.includes(admin)) {
        return { contractId: ev.contractId, adminParty: admin };
      }
    }
  }
  return null;
}

async function createIssuer(token, adminParty) {
  const body = {
    actAs: [adminParty],
    readAs: [adminParty],
    userId: process.env.CANTON_LEDGER_USER_ID?.trim() || '6',
    commandId: `bootstrap-issuer-${Date.now()}`,
    commands: [
      {
        CreateCommand: {
          templateId: issuerTemplate,
          createArguments: {
            platform_admin: adminParty,
            instrumentId: { admin: adminParty, id: 'tUSDC' },
            totalSupply: '0.0',
            meta: {
              values: {
                decimals: '10',
                symbol: 'tUSDC',
                name: 'Test USDC',
              },
            },
          },
        },
      },
    ],
  };

  const res = await fetch(`${ledgerUrl}/v2/commands/submit-and-wait`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Create USDCIssuer failed ${res.status}: ${text.slice(0, 800)}`);
  }

  const parsed = JSON.parse(text);
  const contractId = findCreatedContract(parsed, ':USDCIssuer');
  if (!contractId) {
    throw new Error(`Create succeeded but no issuer CID in response: ${text.slice(0, 500)}`);
  }
  return contractId;
}

function findCreatedContract(node, suffix) {
  if (!node || typeof node !== 'object') return '';
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findCreatedContract(child, suffix);
      if (found) return found;
    }
    return '';
  }
  if (typeof node.contractId === 'string') {
    const tid = node.templateId;
    const tidStr =
      typeof tid === 'string'
        ? tid
        : tid?.moduleName
          ? `${tid.moduleName}:${tid.entityName}`
          : '';
    if (tidStr.endsWith(suffix) || (typeof tid === 'string' && tid.endsWith(suffix))) {
      return node.contractId;
    }
  }
  for (const value of Object.values(node)) {
    const found = findCreatedContract(value, suffix);
    if (found) return found;
  }
  return '';
}

function upsertEnv(updates) {
  let envText = fs.readFileSync(envPath, 'utf8');
  for (const [key, value] of Object.entries(updates)) {
    const line = `${key}=${value}`;
    const re = new RegExp(`^${key}=.*$`, 'm');
    envText = re.test(envText) ? envText.replace(re, line) : `${envText.trimEnd()}\n${line}\n`;
  }
  fs.writeFileSync(envPath, envText, 'utf8');
}

const token = await getToken();
const parties = await getActAsParties(token);
if (parties.length === 0) {
  console.error('M2M user has no CanActAs parties');
  process.exit(1);
}

const configuredAdmin = process.env.CANTON_ACT_AS_PARTY?.trim();
const preferred =
  process.env.CANTON_FAUCET_ADMIN_PARTY?.trim() ||
  (configuredAdmin && parties.includes(configuredAdmin) ? configuredAdmin : '') ||
  parties.find((p) => /rentyvest/i.test(p)) ||
  parties[0];

if (!parties.includes(preferred)) {
  console.error('Preferred admin party is not in M2M CanActAs list:', preferred);
  process.exit(1);
}

console.log('Candidate admin parties:', parties.length);
console.log('Using admin party:', preferred);

let issuer = null;

console.log('Creating USDCIssuer on ledger...');
try {
  const contractId = await createIssuer(token, preferred);
  issuer = { contractId, adminParty: preferred };
  console.log('Created USDCIssuer:', contractId);
} catch (error) {
  console.error('Create failed:', error.message);
  process.exit(1);
}

const updates = {
  CANTON_ACT_AS_PARTY: issuer.adminParty,
  CANTON_READ_AS_PARTY: issuer.adminParty,
  CANTON_ADMIN_PARTY_ID: issuer.adminParty,
  CANTON_USDC_ISSUER_CONTRACT_ID: issuer.contractId,
  NEXT_PUBLIC_CANTON_ADMIN_PARTY_ID: issuer.adminParty,
  NEXT_PUBLIC_USDC_CONTRACT_ID: issuer.contractId,
  NEXT_PUBLIC_CANTON_DAML_PACKAGE_ID: pkg,
};
upsertEnv(updates);
console.log('Updated .env with faucet issuer + admin party');
console.log('Restart core-api, then retry Claim.');
