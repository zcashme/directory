import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  // Canonicalize /ns route casing so /NS and /Ns resolve to /ns.
  const nsPrefixMatch = pathname.match(/^\/ns(?=\/|$)/i);
  if (nsPrefixMatch && !pathname.startsWith('/ns')) {
    url.pathname = `/ns${pathname.slice(nsPrefixMatch[0].length)}`;
    return NextResponse.redirect(url, 308);
  }

  // Support /:slug/refer links by opening join flow on the target profile page.
  const referMatch = pathname.match(/^\/([^/]+)\/refer\/?$/);
  if (referMatch) {
    const reservedRoots = new Set([
      "api",
      "ns",
      "thread",
      "swap-app",
      "stats-app",
      "leader-app",
      "design-system",
      "privacy",
      "terms",
    ]);
    const slug = referMatch[1];
    if (!reservedRoots.has(slug.toLowerCase())) {
      const referredBy = url.searchParams.get("referred_by") || slug;
      const referredById = url.searchParams.get("referred_by_id");
      url.pathname = `/${slug}`;
      url.searchParams.set("join", "1");
      url.searchParams.set("referred_by", referredBy);
      if (referredById) {
        url.searchParams.set("referred_by_id", referredById);
      }
      return NextResponse.redirect(url, 307);
    }
  }

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
    if (url.pathname.startsWith('/stats-app') || url.pathname.startsWith('/donate-app') || url.pathname.startsWith('/thread') || url.pathname.startsWith('/swap-app') || url.pathname.startsWith('/leader-app')) {
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

  // Handle thread subdomain - rewrite to /thread internally
  if (subdomain === 'thread') {
    if (url.pathname === '/') {
      url.pathname = '/thread';
    } else if (!url.pathname.startsWith('/thread')) {
      url.pathname = `/thread${url.pathname}`;
    }
    return NextResponse.rewrite(url);
  }

  // Handle swaps subdomain - rewrite to /swap-app internally
  if (subdomain === 'swaps') {
    if (url.pathname === '/') {
      url.pathname = '/swap-app';
    } else if (!url.pathname.startsWith('/swap-app')) {
      url.pathname = `/swap-app${url.pathname}`;
    }
    return NextResponse.rewrite(url);
  }

  // Handle leaders subdomain - rewrite to /leader-app internally
  if (subdomain === 'leaders') {
    if (url.pathname === '/') {
      url.pathname = '/leader-app';
    } else if (!url.pathname.startsWith('/leader-app')) {
      url.pathname = `/leader-app${url.pathname}`;
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
