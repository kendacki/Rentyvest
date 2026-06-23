const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

export function formatPercent(value: number): string {
  return percentFormatter.format(value / 100);
}

const tokenBalanceFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 6,
});

export function formatTokenBalance(value: number, symbol = 'tUSDC'): string {
  return `${tokenBalanceFormatter.format(value)} ${symbol}`;
}

export function formatLocation(city: string | null, state: string | null): string {
  const parts = [city, state].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'Location unavailable';
}

const nairaFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatNaira(value: number): string {
  return nairaFormatter.format(value);
}

export function truncatePartyId(partyId: string, head = 14, tail = 8): string {
  if (partyId.length <= head + tail + 3) {
    return partyId;
  }

  return `${partyId.slice(0, head)}...${partyId.slice(-tail)}`;
}
