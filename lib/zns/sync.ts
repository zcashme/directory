import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import {
  getZnsSyncedHeight,
  listZnsEvents,
  listZnsRegistrations,
  resolveZnsNetwork,
  verifyZnsResolver,
  type ZnsEvent,
} from "@/lib/zns/client";
import { applyZnsRegistration, deactivateZnsName } from "@/lib/zns/applyBinding";
import { isValidZnsName, normalizeZnsName } from "@/lib/zns/name";

export interface ZnsSyncResult {
  ok: boolean;
  network: string;
  events: number;
  backfilled: number;
  lastHeight: number;
  error?: string;
}

const EVENT_PAGE = 200;
const LIST_PAGE = 500;

async function readCursor(
  supabase: NonNullable<ReturnType<typeof createSupabaseServerClient>>,
  network: string
): Promise<{ lastHeight: number; bootstrapped: boolean }> {
  const { data } = await supabase
    .from("zns_sync_state")
    .select("last_height, last_synced_at")
    .eq("network", network)
    .maybeSingle();
  return {
    lastHeight: typeof data?.last_height === "number" ? data.last_height : 0,
    bootstrapped: Boolean(data?.last_synced_at),
  };
}

async function writeCursor(
  supabase: NonNullable<ReturnType<typeof createSupabaseServerClient>>,
  network: string,
  lastHeight: number
): Promise<void> {
  await supabase.from("zns_sync_state").upsert({
    network,
    last_height: lastHeight,
    last_synced_at: new Date().toISOString(),
  }, { onConflict: "network" });
}

async function backfillLiveRegistrations(): Promise<number> {
  let offset = 0;
  let count = 0;
  for (;;) {
    const page = await listZnsRegistrations(LIST_PAGE, offset);
    for (const registration of page) {
      if (!isValidZnsName(normalizeZnsName(registration.name))) continue;
      await applyZnsRegistration(registration);
      count += 1;
    }
    if (page.length < LIST_PAGE) break;
    offset += LIST_PAGE;
  }
  return count;
}

function sortEvents(events: ZnsEvent[]): ZnsEvent[] {
  return events.slice().sort((a, b) => {
    if (a.height !== b.height) return a.height - b.height;
    if (a.actionIndex !== b.actionIndex) return a.actionIndex - b.actionIndex;
    return a.id - b.id;
  });
}

async function applyEvent(event: ZnsEvent): Promise<void> {
  const name = normalizeZnsName(event.name);
  if (!isValidZnsName(name)) return;

  if (event.action === "release") {
    await deactivateZnsName(name, "release");
    return;
  }

  await applyZnsRegistration({
    name,
    address: event.address,
    txid: event.action === "claim" ? event.txid : event.txid,
    height: event.height,
    lastAction: event.action,
    expiresAt: event.expiresAt,
  });
}

export async function syncZnsRegistry(): Promise<ZnsSyncResult> {
  const network = resolveZnsNetwork();
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, network, events: 0, backfilled: 0, lastHeight: 0, error: "database_unavailable" };
  }

  try {
    await verifyZnsResolver();
    const cursor = await readCursor(supabase, network);
    let backfilled = 0;
    let lastHeight = cursor.lastHeight;

    if (!cursor.bootstrapped) {
      backfilled = await backfillLiveRegistrations();
      lastHeight = await getZnsSyncedHeight();
      await writeCursor(supabase, network, lastHeight);
      return { ok: true, network, events: 0, backfilled, lastHeight };
    }

    let offset = 0;
    let eventsApplied = 0;
    for (;;) {
      const page = await listZnsEvents({
        sinceHeight: lastHeight,
        limit: EVENT_PAGE,
        offset,
      });
      const ordered = sortEvents(page);
      for (const event of ordered) {
        await applyEvent(event);
        eventsApplied += 1;
        if (event.height > lastHeight) lastHeight = event.height;
      }
      if (page.length < EVENT_PAGE) break;
      offset += EVENT_PAGE;
    }

    const syncedHeight = await getZnsSyncedHeight();
    if (syncedHeight > lastHeight) lastHeight = syncedHeight;
    await writeCursor(supabase, network, lastHeight);
    return { ok: true, network, events: eventsApplied, backfilled, lastHeight };
  } catch (error) {
    return {
      ok: false,
      network,
      events: 0,
      backfilled: 0,
      lastHeight: 0,
      error: error instanceof Error ? error.message : "zns_sync_failed",
    };
  }
}
