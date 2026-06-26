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
const { access_token } = await res.json();
const payload = JSON.parse(Buffer.from(access_token.split('.')[1], 'base64url').toString());
console.log(JSON.stringify(payload, null, 2));
