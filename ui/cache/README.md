# Cache Management

This directory contains utilities for managing and clearing caches across the application.

## Overview

The application uses several types of caches:

1. **localStorage caches**:
   - Emoji dataset cache (`emojibase_en_compact_v2`)
   - Avatar URL caches (`discord_avatar_url:`, `x_avatar_url:`, `github_avatar_url:`)

2. **Memory caches**:
   - Profiles cache (`cachedProfiles` in `useProfiles.js`)
   - Lazy visible image cache (`useLazyVisible.js`)

3. **Next.js build cache**:
   - `.next/` directory (build output and cache)

## Usage

### Clear All Application Caches

```javascript
import { clearAllCaches } from "@/ui/cache/clearCache";

// Clear all localStorage and memory caches
const result = clearAllCaches();
console.log(result);
```

### Clear Specific Cache Types

```javascript
import {
  clearLocalStorageCaches,
  clearMemoryCaches
} from "@/ui/cache/clearCache";

// Clear only localStorage caches
clearLocalStorageCaches();

// Clear only memory caches
clearMemoryCaches();
```

### Clear Individual Module Caches

```javascript
// Clear profiles cache
import { resetCache } from "@/ui/directory/useProfiles";
resetCache();

// Clear emoji cache
import { clearEmojiCache } from "@/ui/messaging/useEmojiAutocomplete";
clearEmojiCache();

// Clear avatar cache (all or specific provider/profile)
import { clearAvatarCache } from "@/lib/social/providerAvatars";
clearAvatarCache(); // Clear all avatars
clearAvatarCache("discord"); // Clear only Discord avatars
clearAvatarCache("twitter", "profile-id"); // Clear specific profile's Twitter avatars

// Clear lazy visible cache
import { clearLazyVisibleCache } from "@/ui/common/useLazyVisible";
clearLazyVisibleCache();
```

### Get Cache Statistics

```javascript
import { getCacheStats } from "@/ui/cache/clearCache";

const stats = getCacheStats();
console.log(stats);
// {
//   available: true,
//   localStorage: {
//     emoji: true,
//     avatarKeys: ["discord_avatar_url:123:user", ...]
//   },
//   memory: {
//     profiles: true
//   }
// }
```

### Clear Next.js Build Cache

From the command line:

```bash
npm run clear-cache
```

Or directly:

```bash
node scripts/clear-cache.js
```

This will remove:
- `.next/` directory (Next.js build output and cache)
- Any cache directories in `node_modules/`

## Cache Details

### Emoji Cache
- **Storage**: localStorage
- **Key**: `emojibase_en_compact_v2`
- **TTL**: 7 days
- **Purpose**: Caches emoji dataset for autocomplete

### Avatar Caches
- **Storage**: localStorage
- **Keys**: `{provider}_avatar_url:{profileId}:{handle}`
- **Providers**: discord, twitter (x), github
- **Purpose**: Caches avatar URLs fetched from social providers

### Profiles Cache
- **Storage**: Memory (module-level variable + `window.cachedProfiles`)
- **Purpose**: Caches the full profiles list to avoid refetching

### Lazy Visible Cache
- **Storage**: Memory (Map)
- **Purpose**: Tracks which images have been loaded for lazy loading optimization

## Notes

- All cache clearing functions are safe to call multiple times
- Server-side rendering contexts will skip localStorage operations
- Memory caches persist until the module is reloaded or explicitly cleared
- Next.js build cache should be cleared when experiencing build issues or after major dependency updates
