export function getCoreApiUrl(): string {
  const base =
    process.env.CORE_API_URL ??
    process.env.NEXT_PUBLIC_CORE_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://127.0.0.1:8080';

  const trimmed = base.trim();
  if (!trimmed) {
    return 'http://127.0.0.1:8080';
  }

  const withProtocol =
    trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `https://${trimmed}`;

  return withProtocol
    .replace(/\/$/, '')
    .replace('://localhost', '://127.0.0.1');
}
