#!/usr/bin/env node

/**
 * Script to clear Next.js build cache and other build artifacts
 * Usage: node scripts/clear-cache.js
 */

const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");

function removeDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return { removed: false, message: "Directory does not exist" };
  }

  try {
    fs.rmSync(dirPath, { recursive: true, force: true });
    return { removed: true, message: "Directory removed successfully" };
  } catch (error) {
    return { removed: false, message: error.message };
  }
}

function clearNextCache() {
  const nextDir = path.join(projectRoot, ".next");
  return removeDir(nextDir);
}

function clearNodeModulesCache() {
  const cacheDirs = [
    path.join(projectRoot, "node_modules", ".cache"),
  ];

  const results = [];
  for (const dir of cacheDirs) {
    if (fs.existsSync(dir)) {
      results.push({ path: dir, ...removeDir(dir) });
    }
  }

  return results;
}

function main() {
  console.log("🧹 Clearing caches...\n");

  // Clear Next.js build cache
  console.log("Clearing Next.js build cache (.next/)...");
  const nextResult = clearNextCache();
  if (nextResult.removed) {
    console.log("✅ Next.js cache cleared\n");
  } else {
    console.log(`⚠️  ${nextResult.message}\n`);
  }

  // Clear node_modules cache directories
  console.log("Clearing node_modules cache directories...");
  const nodeCacheResults = clearNodeModulesCache();
  if (nodeCacheResults.length > 0) {
    nodeCacheResults.forEach((result) => {
      if (result.removed) {
        console.log(`✅ Cleared ${result.path}`);
      } else {
        console.log(`⚠️  ${result.path}: ${result.message}`);
      }
    });
  } else {
    console.log("✅ No node_modules cache directories found");
  }

  console.log("\n✨ Cache cleanup complete!");
  console.log("\nNote: To clear application caches (localStorage, memory),");
  console.log("use the clearAllCaches() function from @/ui/cache/clearCache");
}

if (require.main === module) {
  main();
}

module.exports = { clearNextCache, clearNodeModulesCache };
