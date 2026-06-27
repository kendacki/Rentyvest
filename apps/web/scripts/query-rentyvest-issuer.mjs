const ledgerUrl = (process.env.CANTON_JSON_API_URL ?? '').replace(/\/$/, '');
const pkg = process.env.CANTON_DAML_PACKAGE_ID;
const party = 'out-mqdl789t::1220a14ca128063b8dc9d1ebb0bd22633be9f2168500f4dbc1ecaeb1855b14e5acf8';

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

// List packages
const pkgRes = await fetch(`${ledgerUrl}/v2/packages`, {
  headers: { Authorization: `Bearer ${token}` },
});
const packages = await pkgRes.json();
const hasPkg = packages.packageIds?.includes(pkg);
console.log('Our package on ledger?', hasPkg, pkg);
console.log('Total packages:', packages.packageIds?.length ?? 0);

const ledgerEndRes = await fetch(`${ledgerUrl}/v2/state/ledger-end`, {
  headers: { Authorization: `Bearer ${token}` },
});
const { offset } = await ledgerEndRes.json();

const templateFilter = {
  templateId: {
    packageId: pkg,
    moduleName: 'RentyVest.TestUSDC',
    entityName: 'USDCIssuer',
  },
  includeCreatedEventBlob: false,
};

const acsRes = await fetch(`${ledgerUrl}/v2/state/active-contracts`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    filter: {
      filtersByParty: {
        [party]: { cumulative: [{ templateFilters: [templateFilter] }] },
      },
    },
    verbose: true,
    activeAtOffset: String(offset),
  }),
});
const acsText = await acsRes.text();
console.log('\nStructured template filter:', acsRes.status);
if (acsRes.ok) {
  const acs = JSON.parse(acsText);
  console.log('USDCIssuer count:', acs.length);
  for (const entry of acs.slice(0, 5)) {
    const ev = entry.contractEntry?.JsActiveContract?.createdEvent;
    if (ev) {
      console.log({
        contractId: ev.contractId,
        templateId: ev.templateId,
        platform_admin: ev.createArgument?.platform_admin,
        signatories: ev.signatories,
      });
    }
  }
} else {
  console.log(acsText.slice(0, 500));
}
