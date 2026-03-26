import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ── CORS policy (applied to all /api/* routes) ────────────────────────────────
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, Authorization',
  'Access-Control-Max-Age': '86400',
};

// Single source of truth for all subdomain-routed apps.
// To add a new app, add one entry here — everything else derives from it.
const apps: Record<string, { path: string; aliases?: string[] }> = {
  swap:    { path: '/swap-app', aliases: ['swaps'] },
  donate:  { path: '/donate-app' },
  thread:  { path: '/thread' },
  leaders: { path: '/leader-app', aliases: ['leader'] },
  blog:    { path: '/blog-app' },
  status:  { path: '/status-app' },
};

// Subdomain (including aliases) → internal path
const subdomainMap = new Map<string, string>();
// Alias subdomain → canonical subdomain
const aliasToCanonicalMap = new Map<string, string>();
for (const [sub, cfg] of Object.entries(apps)) {
  subdomainMap.set(sub, cfg.path);
  for (const alias of cfg.aliases ?? []) {
    subdomainMap.set(alias, cfg.path);
    aliasToCanonicalMap.set(alias, sub);
  }
}

// Internal paths that should 404 when accessed without a subdomain
const blockedPaths = Object.values(apps).map(a => a.path);

// Reserved roots that should never be treated as usernames in referral links
const reservedRoots = new Set([
  ...Object.keys(apps),
  ...Object.values(apps).map(a => a.path.slice(1)),
  ...Object.values(apps).flatMap(a => a.aliases ?? []),
  'api', 'ns', 'design-system', 'privacy', 'terms',
]);

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  // ── CORS for API routes ────────────────────────────────────────────────────
  if (pathname.startsWith('/api/')) {
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers: corsHeaders });
    }
    const response = NextResponse.next();
    for (const [key, value] of Object.entries(corsHeaders)) {
      response.headers.set(key, value);
    }
    return response;
  }

  const forwardedHost = request.headers.get('x-forwarded-host');
  const directHost = request.headers.get('host');
  const hostname = (forwardedHost ?? directHost ?? '')
    .split(',')[0]
    .trim()
    .toLowerCase();

  // Canonicalize /ns route casing so /NS and /Ns resolve to /ns.
  const nsPrefixMatch = pathname.match(/^\/ns(?=\/|$)/i);
  if (nsPrefixMatch && !pathname.startsWith('/ns')) {
    url.pathname = `/ns${pathname.slice(nsPrefixMatch[0].length)}`;
    return NextResponse.redirect(url, 308);
  }

  // Support /:slug/refer links by opening join flow on the target profile page.
  const referMatch = pathname.match(/^\/([^/]+)\/refer\/?$/);
  if (referMatch) {
    const slug = referMatch[1];
    if (!reservedRoots.has(slug.toLowerCase())) {
      const referredBy = url.searchParams.get("referred_by") ?? slug;
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

  // Redirect alias subdomains to their canonical subdomain.
  // Example: leader.zcash.me -> leaders.zcash.me
  if (subdomain) {
    const canonicalSubdomain = aliasToCanonicalMap.get(subdomain);
    if (canonicalSubdomain && hostname.startsWith(`${subdomain}.`)) {
      const canonicalHost = `${canonicalSubdomain}.${hostname.slice(subdomain.length + 1)}`;
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.host = canonicalHost;
      return NextResponse.redirect(redirectUrl, 308);
    }
  }

  // Block direct access to app-specific routes (subdomain required)
  if (!subdomain && blockedPaths.some(p => pathname.startsWith(p))) {
    return new NextResponse(null, { status: 404 });
  }

  // Rewrite subdomain requests to internal app paths
  const appPath = subdomain ? subdomainMap.get(subdomain) : undefined;
  if (appPath) {
    url.pathname = pathname === '/' ? appPath : pathname.startsWith(appPath) ? pathname : `${appPath}${pathname}`;
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
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
