/**
 * Cache cleanup utilities
 * Provides functions to clear all caches across the application
 */

import { resetCache } from "@/lib/directory/useProfiles";
import { clearEmojiCache } from "@/lib/useEmojiAutocomplete";
import { clearAvatarCache } from "@/lib/social/providerAvatars";
import { clearLazyVisibleCache } from "@/lib/useLazyVisible";

// Emoji cache key
const EMOJI_CACHE_KEY = "emojibase_en_compact_v2";

// Avatar cache key patterns
const AVATAR_KEY_PATTERNS = [
  "discord_avatar_url:",
  "x_avatar_url:",
  "github_avatar_url:",
];

/**
 * Clear all localStorage caches
 */
export function clearLocalStorageCaches() {
  if (typeof window === "undefined") {
    return {
      success: false,
      error: "localStorage not available in server-side context",
    };
  }

  try {
    // Clear emoji cache using module function
    const emojiCleared = clearEmojiCache();

    // Clear avatar caches using module function
    const avatarResult = clearAvatarCache();

    return {
      success: true,
      cleared: {
        emoji: emojiCleared,
        avatars: avatarResult.cleared,
      },
    };
  } catch (error) {
    console.error("Error clearing localStorage caches:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Clear memory caches
 * Clears module-level memory caches
 */
export function clearMemoryCaches() {
  try {
    // Clear profiles cache
    resetCache();

    // Clear lazy visible cache
    const lazyVisibleResult = clearLazyVisibleCache();

    return {
      success: true,
      cleared: {
        profiles: true,
        lazyVisible: lazyVisibleResult.cleared,
      },
    };
  } catch (error) {
    console.error("Error clearing memory caches:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Clear all application caches (localStorage + memory)
 */
export function clearAllCaches() {
  const localStorageResult = clearLocalStorageCaches();
  const memoryResult = clearMemoryCaches();

  return {
    localStorage: localStorageResult,
    memory: memoryResult,
    success: localStorageResult.success && memoryResult.success,
  };
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  if (typeof window === "undefined") {
    return {
      available: false,
      message: "Not available in server-side context",
    };
  }

  try {
    const stats = {
      localStorage: {
        emoji: localStorage.getItem(EMOJI_CACHE_KEY) ? true : false,
        avatarKeys: [],
      },
      memory: {
        profiles: window.cachedProfiles !== null && window.cachedProfiles !== undefined,
      },
    };

    // Count avatar cache keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && AVATAR_KEY_PATTERNS.some((pattern) => key.startsWith(pattern))) {
        stats.localStorage.avatarKeys.push(key);
      }
    }

    return {
      available: true,
      ...stats,
    };
  } catch (error) {
    return {
      available: false,
      error: error.message,
    };
  }
}
