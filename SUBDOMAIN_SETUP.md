# Subdomain Configuration Guide

This application uses **subdomain routing** for swap and stats features.

## Routing Structure

- Main site: `https://zcash.me` - Profile directory
- Swap: `https://swap.zcash.me` - Swap interface and status tracking
- Stats: `https://stats.zcash.me` - Network statistics dashboard

## Configuration

### Environment Variables

Add this variable to your `.env` file:

```bash
# Your base domain (required)
# For production: zcash.me
# For local development: localhost:3000
NEXT_PUBLIC_BASE_DOMAIN=zcash.me
```

### For Local Development

**Option 1: Using .localhost domains (recommended)**

Set your `.env`:
```bash
NEXT_PUBLIC_BASE_DOMAIN=localhost:3000
```

Add to `/etc/hosts`:
```
127.0.0.1 swap.localhost
127.0.0.1 stats.localhost
```

Access at:
- Main: `http://localhost:3000`
- Swap: `http://swap.localhost:3000`
- Stats: `http://stats.localhost:3000`

### For Production Deployment

#### 1. DNS Configuration

Add CNAME records for your subdomains:

```
swap.zcash.me  → CNAME → your-deployment.vercel.app
stats.zcash.me → CNAME → your-deployment.vercel.app
```

#### 2. Platform Configuration (Vercel)

In your Vercel project settings:

1. Go to **Settings** → **Domains**
2. Add these custom domains:
   - `zcash.me` (main domain)
   - `swap.zcash.me`
   - `stats.zcash.me`
3. Vercel will automatically issue SSL certificates for all domains

#### 3. Environment Variables

In your production environment:

```bash
NEXT_PUBLIC_BASE_DOMAIN=zcash.me
```

## How It Works

### Middleware (`middleware.ts`)

The middleware intercepts requests to subdomain URLs and rewrites them internally to serve the appropriate pages:

- `swap.zcash.me` → internally serves `/swap` page
- `stats.zcash.me` → internally serves `/stats` page

This allows you to keep your code organized in `/app/swap/` and `/app/stats/` directories while presenting clean subdomain URLs to users.

### URL Generation

The utility functions in `lib/swap/utils.ts` generate subdomain URLs:

```typescript
import { getSwapUrl, getStatsUrl } from "@/lib/swap/utils";

// Generate swap URL with deposit address
const swapUrl = getSwapUrl({ depositAddress: "0x123..." });
// Returns: "https://swap.zcash.me?depositAddress=0x123..."

// Generate stats URL
const statsUrl = getStatsUrl();
// Returns: "https://stats.zcash.me"
```

## Benefits of Subdomain Routing

1. **Cleaner URLs**: `swap.zcash.me` is more memorable than `zcash.me/swap`
2. **Better Analytics**: Easier to track traffic per feature with subdomain filtering
3. **SEO**: Each subdomain can be optimized independently with separate sitemaps
4. **Professional**: Subdomain structure is more scalable for future features
5. **Flexibility**: Each subdomain can have different configurations or deployments

## API Routes

API routes remain path-based and accessible from any domain:
- `/api/swap/status` - accessible from all domains
- `/api/search` - accessible from all domains

This ensures the API can be called from the main site or any subdomain.
