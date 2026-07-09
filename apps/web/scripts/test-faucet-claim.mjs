/** Test POST /faucet/usdc via core-api. */
const apiUrl = process.env.NEXT_PUBLIC_CORE_API_URL ?? 'http://localhost:8080';
const party =
  process.argv[2] ??
  'out-mqdl789t::1220a14ca128063b8dc9d1ebb0bd22633be9f2168500f4dbc1ecaeb1855b14e5acf8';

const res = await fetch(`${apiUrl}/faucet/usdc`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Canton-Party-Id': party,
  },
  body: JSON.stringify({ canton_party_id: party }),
});

const text = await res.text();
console.log('Status:', res.status);
console.log(text);
