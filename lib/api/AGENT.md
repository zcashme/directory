# /lib/api - API Utilities

## Purpose
Security utilities for API routes: rate limiting, API key validation,
and response formatting.

## Key Files

### guard.ts
API protection middleware:
```typescript
interface GuardOptions {
  rateLimit?: {
    window: number;      // Time window in ms
    maxRequests: number; // Max requests per window
  };
  requireApiKey?: boolean;
}

async function apiGuard(
  request: Request,
  options?: GuardOptions
): Promise<{ allowed: boolean; error?: string }>
```

**Rate Limiting:**
- Per-IP tracking
- Sliding window algorithm
- Returns 429 when exceeded

**API Key Validation:**
```typescript
// Check header
const apiKey = request.headers.get('x-api-key');
if (apiKey !== process.env.API_KEY) {
  return { allowed: false, error: 'Invalid API key' };
}
```

### types.ts
API response types:
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    cursor?: string;
    total?: number;
  };
}
```

## Usage in API Routes

```typescript
// app/api/directory/route.ts
import { apiGuard } from '@/lib/api/guard';

export async function GET(request: Request) {
  const guard = await apiGuard(request, {
    rateLimit: { window: 60000, maxRequests: 100 }
  });

  if (!guard.allowed) {
    return Response.json(
      { error: guard.error },
      { status: 429 }
    );
  }

  // ... handle request
}
```

## Environment Variables
```
API_KEY              - Server-side API key for validation
NEXT_PUBLIC_API_KEY  - Client-side (for authenticated requests)
```

## Testing Harness
- Mock time for rate limit tests
- Test various IP scenarios
- Verify API key validation
- Check response format consistency

## Security Notes
- Never expose server API_KEY to client
- Rate limits apply per-IP
- Log suspicious activity
- Return generic errors (don't leak info)
