import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
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

  // Block direct access to app-specific routes
  if (!subdomain) {
    if (url.pathname.startsWith('/swap-app') || url.pathname.startsWith('/stats-app') || url.pathname.startsWith('/donate-app') || url.pathname.startsWith('/thread-app') || url.pathname.startsWith('/swaps-app')) {
      return new NextResponse(null, { status: 404 });
    }
  }

  // Handle swap subdomain - rewrite to /swap-app internally
  if (subdomain === 'swap') {
    if (url.pathname === '/') {
      url.pathname = '/swap-app';
    } else if (!url.pathname.startsWith('/swap-app')) {
      url.pathname = `/swap-app${url.pathname}`;
    }
    return NextResponse.rewrite(url);
  }

  // Handle stats subdomain - rewrite to /stats-app internally
  if (subdomain === 'stats') {
    if (url.pathname === '/') {
      url.pathname = '/stats-app';
    } else if (!url.pathname.startsWith('/stats-app')) {
      url.pathname = `/stats-app${url.pathname}`;
    }
    return NextResponse.rewrite(url);
  }

  // Handle donate subdomain - rewrite to /donate-app internally
  if (subdomain === 'donate') {
    if (url.pathname === '/') {
      url.pathname = '/donate-app';
    } else if (!url.pathname.startsWith('/donate-app')) {
      url.pathname = `/donate-app${url.pathname}`;
    }
    return NextResponse.rewrite(url);
  }

  // Handle thread subdomain - rewrite to /thread-app internally
  if (subdomain === 'thread') {
    if (url.pathname === '/') {
      url.pathname = '/thread-app';
    } else if (!url.pathname.startsWith('/thread-app')) {
      url.pathname = `/thread-app${url.pathname}`;
    }
    return NextResponse.rewrite(url);
  }

  // Handle swaps subdomain - rewrite to /swaps-app internally
  if (subdomain === 'swaps') {
    if (url.pathname === '/') {
      url.pathname = '/swaps-app';
    } else if (!url.pathname.startsWith('/swaps-app')) {
      url.pathname = `/swaps-app${url.pathname}`;
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
