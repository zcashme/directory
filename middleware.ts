import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const url = request.nextUrl.clone();

  // Extract subdomain (handle both localhost and production domains)
  const parts = hostname.split('.');
  let subdomain: string | null = null;

  // For localhost: swap.localhost:3000 → parts = ["swap", "localhost:3000"]
  // For production: swap.zcash.me → parts = ["swap", "zcash", "me"]
  if (parts.length >= 2) {
    const isLocalhost = parts[parts.length - 1].includes('localhost');
    const isProduction = parts.length >= 3;

    if (isLocalhost || isProduction) {
      subdomain = parts[0];
    }
  }

  // Handle swap subdomain - rewrite to /swap internally
  if (subdomain === 'swap') {
    if (url.pathname === '/') {
      url.pathname = '/swap';
    } else if (!url.pathname.startsWith('/swap')) {
      url.pathname = `/swap${url.pathname}`;
    }
    return NextResponse.rewrite(url);
  }

  // Handle stats subdomain - rewrite to /stats internally
  if (subdomain === 'stats') {
    if (url.pathname === '/') {
      url.pathname = '/stats';
    } else if (!url.pathname.startsWith('/stats')) {
      url.pathname = `/stats${url.pathname}`;
    }
    return NextResponse.rewrite(url);
  }

  // Continue to the requested page
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     * - api routes (they should remain path-based)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
