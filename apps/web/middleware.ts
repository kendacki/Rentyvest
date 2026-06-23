import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_ROUTES = [
  '/portfolio',
  '/pledge',
  '/yield',
  '/seller',
  '/manager',
  '/admin',
] as const;

const AUTH_ROUTES = ['/login', '/register'] as const;

const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'X-XSS-Protection': '1; mode=block',
};

function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(header, value);
  }
  return response;
}

function matchesRoute(pathname: string, routes: readonly string[]): boolean {
  return routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function isAuthenticated(request: NextRequest): boolean {
  const privyToken = request.cookies.get('privy-token')?.value;
  const privySession = request.cookies.get('privy-session')?.value;

  return Boolean(privyToken?.trim()) || Boolean(privySession?.trim());
}

function isOAuthCallback(request: NextRequest): boolean {
  const searchParams = request.nextUrl.searchParams;

  return (
    searchParams.has('privy_oauth_code') ||
    searchParams.has('privy_oauth_state') ||
    searchParams.has('privy_oauth_provider')
  );
}

export function middleware(request: NextRequest): NextResponse {
  if (isOAuthCallback(request)) {
    return applySecurityHeaders(NextResponse.next());
  }

  const { pathname } = request.nextUrl;
  const authenticated = isAuthenticated(request);
  const isProtectedRoute = matchesRoute(pathname, PROTECTED_ROUTES);
  const isAuthRoute = matchesRoute(pathname, AUTH_ROUTES);

  if (isProtectedRoute && !authenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('reason', 'session_expired');
    return applySecurityHeaders(NextResponse.redirect(loginUrl));
  }

  if (isAuthRoute && authenticated) {
    const marketplaceUrl = new URL('/marketplace', request.url);
    return applySecurityHeaders(NextResponse.redirect(marketplaceUrl));
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
