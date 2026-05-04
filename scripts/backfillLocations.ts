import * as fs from "node:fs";

import { createSupabaseServerClient } from "../lib/supabase/supabase-server";
import {
  bucketLocationResolutions,
  isProfileLocationIncomplete,
  type BackfillProfileRow,
} from "../lib/directory/locationBackfill";

interface BackfillOptions {
  apply: boolean;
  dryRun: boolean;
  limit: number | null;
  ids: number[];
  json: boolean;
}

interface BackfillSummary {
  totalScanned: number;
  skippedComplete: number;
  candidates: number;
  updated: number;
  unresolved: number;
  ambiguous: number;
  aliasResolved: number;
}

const PAGE_SIZE = 1000;
const UPDATE_BATCH_SIZE = 25;
const SAMPLE_SIZE = 10;

function loadEnvFileIfPresent(path: string): void {
  if (!fs.existsSync(path)) return;
  const content = fs.readFileSync(path, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const separatorIndex = trimmed.indexOf("=");
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function parseNumberFlag(value: string, flagName: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Expected ${flagName} to be a positive integer.`);
  }
  return parsed;
}

function parseArgs(argv: string[]): BackfillOptions {
  let apply = false;
  let dryRun = false;
  let limit: number | null = null;
  let ids: number[] = [];
  let json = false;

  for (const arg of argv) {
    if (arg === "--apply") {
      apply = true;
      continue;
    }
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg === "--json") {
      json = true;
      continue;
    }
    if (arg.startsWith("--limit=")) {
      limit = parseNumberFlag(arg.slice("--limit=".length), "--limit");
      continue;
    }
    if (arg.startsWith("--ids=")) {
      ids = arg
        .slice("--ids=".length)
        .split(",")
        .map((value) => parseNumberFlag(value.trim(), "--ids"))
        .filter((value, index, array) => array.indexOf(value) === index);
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!apply && !dryRun) {
    dryRun = true;
  }

  if (apply && dryRun) {
    throw new Error('Use either "--apply" or "--dry-run", not both.');
  }

  return { apply, dryRun, limit, ids, json };
}

async function fetchProfilesByIds(ids: number[]): Promise<BackfillProfileRow[]> {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase client not available. Check environment variables.");
  }

  const { data, error } = await supabase
    .from("zcasher")
    .select("id,name,nearest_city_name,country,iso2")
    .in("id", ids)
    .order("id", { ascending: true });

  if (error) {
    throw new Error(error.message || "Failed to fetch requested profiles.");
  }

  return (data ?? []) as BackfillProfileRow[];
}

async function fetchAllProfilesWithLocations(): Promise<BackfillProfileRow[]> {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase client not available. Check environment variables.");
  }

  const rows: BackfillProfileRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("zcasher")
      .select("id,name,nearest_city_name,country,iso2")
      .not("nearest_city_name", "is", null)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(error.message || "Failed to fetch profiles.");
    }

    const batch = (data ?? []) as BackfillProfileRow[];
    if (!batch.length) break;

    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

function formatSummary(summary: BackfillSummary): string {
  return [
    `Scanned: ${summary.totalScanned}`,
    `Skipped complete: ${summary.skippedComplete}`,
    `Candidates: ${summary.candidates}`,
    `Resolvable updates: ${summary.updated}`,
    `Alias-resolved: ${summary.aliasResolved}`,
    `Ambiguous: ${summary.ambiguous}`,
    `Unresolved: ${summary.unresolved}`,
  ].join("\n");
}

function sliceSample<T>(items: T[]): T[] {
  return items.slice(0, SAMPLE_SIZE);
}

async function applyUpdates(
  items: Array<BackfillProfileRow & { country: string; iso2: string }>
): Promise<number> {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase client not available. Check environment variables.");
  }

  let updated = 0;

  for (let index = 0; index < items.length; index += UPDATE_BATCH_SIZE) {
    const batch = items.slice(index, index + UPDATE_BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (item) => {
        const { error } = await supabase
          .from("zcasher")
          .update({
            country: item.country,
            iso2: item.iso2,
          })
          .eq("id", item.id);

        if (error) {
          throw new Error(`Failed to update row ${item.id}: ${error.message}`);
        }

        return 1;
      })
    );

    updated += results.reduce((sum, value) => sum + value, 0);
  }

  return updated;
}

function emitOutput(
  options: BackfillOptions,
  summary: BackfillSummary,
  details: ReturnType<typeof bucketLocationResolutions>,
  appliedCount: number
): void {
  if (options.json) {
    console.log(
      JSON.stringify(
        {
          mode: options.apply ? "apply" : "dry-run",
          summary: {
            ...summary,
            appliedCount,
          },
          samples: {
            updated: sliceSample(details.updated),
            aliasResolved: sliceSample(details.aliasResolved),
            ambiguous: sliceSample(details.ambiguous),
            unresolved: sliceSample(details.unresolved),
          },
        },
        null,
        2
      )
    );
    return;
  }

  console.log(options.apply ? "Applied location backfill." : "Dry run only.");
  console.log(formatSummary(summary));

  if (appliedCount > 0) {
    console.log(`Applied updates: ${appliedCount}`);
  }

  const sampleGroups = [
    ["Updated sample", sliceSample(details.updated)],
    ["Alias-resolved sample", sliceSample(details.aliasResolved)],
    ["Ambiguous sample", sliceSample(details.ambiguous)],
    ["Unresolved sample", sliceSample(details.unresolved)],
  ] as const;

  for (const [label, sample] of sampleGroups) {
    if (!sample.length) continue;
    console.log(`\n${label}:`);
    console.log(JSON.stringify(sample, null, 2));
  }
}

async function main(): Promise<void> {
  loadEnvFileIfPresent(".env");
  const options = parseArgs(process.argv.slice(2));

  const allProfiles = options.ids.length
    ? await fetchProfilesByIds(options.ids)
    : await fetchAllProfilesWithLocations();

  const limitedProfiles =
    options.limit === null ? allProfiles : allProfiles.slice(0, options.limit);

  const candidates = limitedProfiles.filter(isProfileLocationIncomplete);
  const details = bucketLocationResolutions(candidates);
  const updates = [...details.updated, ...details.aliasResolved].map((item) => ({
    id: item.id,
    name: item.name,
    nearest_city_name: item.nearest_city_name,
    country: item.resolved.country,
    iso2: item.resolved.iso2,
  }));

  const summary: BackfillSummary = {
    totalScanned: limitedProfiles.length,
    skippedComplete: limitedProfiles.length - candidates.length,
    candidates: candidates.length,
    updated: details.updated.length,
    aliasResolved: details.aliasResolved.length,
    ambiguous: details.ambiguous.length,
    unresolved: details.unresolved.length,
  };

  const appliedCount = options.apply ? await applyUpdates(updates) : 0;
  emitOutput(options, summary, details, appliedCount);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
