import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

// Exercise the actual server action with isolated OTP and database boundaries.
const source = ts.transpileModule(
  readFileSync(new URL("./confirmOtpAction.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;

function setup(options = {}) {
  const calls = [];
  const profile = { address: "owned-address", name: "alice", ...options.profile };
  let deleting = false;
  const query = {
    select() { return this; },
    eq(key, value) { calls.push(["eq", key, value]); return this; },
    delete() { deleting = true; calls.push(["delete"]); return this; },
    update() { calls.push(["update"]); throw new Error("ordinary update reached"); },
    async single() {
      return deleting
        ? { data: options.deleteError || options.missing ? null : { id: 42 }, error: options.deleteError }
        : { data: profile, error: null };
    },
  };
  const mocks = {
    "@/lib/verification/otp": { verifyOtp: async () => options.validOtp !== false },
    "@/lib/verification/session": {
      parseMaxiOtpZvsMemo: () => null,
      parseZvsMemo: () => options.invalidMemo ? null : { userAddress: options.address ?? "owned-address" },
    },
    "@/lib/supabase/supabase-server": {
      createSupabaseServerClient: () => ({ from(table) { calls.push(["from", table]); return query; } }),
    },
    "@/lib/zns/client": { resolveZnsName: async () => ({ address: "owned-address" }) },
    "@/lib/profile/profileCardTheme": { normalizeProfileThemePackageSelectionId: () => null },
  };
  const exports = {};
  new Function("require", "exports", source)((name) => mocks[name] ?? {}, exports);
  return { confirm: (edits = { name: "" }) => exports.confirmOtpAction(42, "123456", "memo", edits), calls };
}

test("verified username deletion removes the source row, not just its name", async () => {
  const { confirm, calls } = setup();
  assert.deepEqual(await confirm(), { ok: true, data: { status: "deleted" } });
  assert.deepEqual(calls.filter(([op]) => op === "from"), [["from", "zcasher"], ["from", "zcasher"]]);
  assert.ok(calls.some(([op]) => op === "delete"));
  assert.ok(calls.some(([op, key, value]) => op === "eq" && key === "address" && value === "owned-address"));
  assert.ok(!calls.some(([op]) => op === "update"));
});

for (const [label, options] of [
  ["invalid OTP", { validOtp: false }],
  ["invalid memo", { invalidMemo: true }],
  ["address mismatch", { address: "someone-else" }],
  ["active ZNS profile", { profile: { zns_active: true, zns_name: "alice" } }],
  ["inactive ZNS binding", { profile: { zns_active: false, zns_name: "alice" } }],
]) {
  test(`deletion is blocked for ${label}`, async () => {
    const { confirm, calls } = setup(options);
    assert.equal((await confirm()).ok, false);
    assert.ok(!calls.some(([op]) => op === "delete"));
  });
}

for (const options of [{ deleteError: { message: "foreign key violation" } }, { missing: true }]) {
  test(`failed deletion never reports success: ${JSON.stringify(options)}`, async () => {
    const { confirm } = setup(options);
    const result = await confirm();
    assert.equal(result.ok, false);
    assert.equal(result.data.status, "error");
  });
}

test("ordinary verification does not delete a profile", async () => {
  const { confirm, calls } = setup();
  await confirm({ bio: "updated" });
  assert.ok(calls.some(([op]) => op === "update"));
  assert.ok(!calls.some(([op]) => op === "delete"));
});
