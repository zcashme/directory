import assert from "node:assert/strict";
import test from "node:test";
import {
  detectProviderFromUrl,
  extractProviderHandleFromUrl,
  getProviderKeyForPlatform,
  isDomainUrl,
  parseSocialLinkAuthIntent,
  PROVIDERS,
} from "./providers.ts";

test("parseSocialLinkAuthIntent accepts verify, reverify, and unverify", () => {
  assert.equal(parseSocialLinkAuthIntent("verify"), "verify");
  assert.equal(parseSocialLinkAuthIntent("reverify"), "reverify");
  assert.equal(parseSocialLinkAuthIntent("unverify"), "unverify");
});

test("parseSocialLinkAuthIntent rejects unknown values", () => {
  assert.equal(parseSocialLinkAuthIntent("authenticate"), null);
  assert.equal(parseSocialLinkAuthIntent(""), null);
  assert.equal(parseSocialLinkAuthIntent(undefined), null);
  assert.equal(parseSocialLinkAuthIntent(1), null);
});

test("detectProviderFromUrl maps Telegram profile URLs", () => {
  assert.equal(detectProviderFromUrl("https://t.me/zcashnames"), "custom:telegram");
  assert.equal(detectProviderFromUrl("https://telegram.me/zcashnames"), "custom:telegram");
  assert.equal(detectProviderFromUrl("https://www.t.me/ZcashNames"), "custom:telegram");
});

test("extractProviderHandleFromUrl reads Telegram usernames", () => {
  assert.equal(extractProviderHandleFromUrl("https://t.me/zcashnames", "custom:telegram"), "zcashnames");
  assert.equal(extractProviderHandleFromUrl("https://t.me/Zcash_Names/", "custom:telegram"), "Zcash_Names");
  assert.equal(extractProviderHandleFromUrl("https://t.me/@zcashnames", "custom:telegram"), "zcashnames");
});

test("extractProviderHandleFromUrl rejects Telegram invite and deep links", () => {
  assert.equal(extractProviderHandleFromUrl("https://t.me/+AbCdEf", "custom:telegram"), null);
  assert.equal(extractProviderHandleFromUrl("https://t.me/joinchat/AbCdEf", "custom:telegram"), null);
  assert.equal(extractProviderHandleFromUrl("https://t.me/c/123456/1", "custom:telegram"), null);
  assert.equal(extractProviderHandleFromUrl("https://t.me/s/zcashnames", "custom:telegram"), null);
  assert.equal(extractProviderHandleFromUrl("https://t.me/share?url=https://zcash.me", "custom:telegram"), null);
  assert.equal(detectProviderFromUrl("https://t.me/joinchat"), null);
});

test("getProviderKeyForPlatform maps Telegram to the custom OIDC provider", () => {
  assert.equal(getProviderKeyForPlatform("Telegram"), "custom:telegram");
});

test("Telegram profile URLs are OAuth links, not domain homepages", () => {
  assert.equal(isDomainUrl("https://t.me/zcashnames"), false);
  assert.equal(isDomainUrl("https://telegram.me/zcashnames"), false);
});

test("Telegram getHandle reads preferred_username from OIDC claims", () => {
  assert.equal(
    PROVIDERS["custom:telegram"].getHandle({ preferred_username: "zcashnames" }),
    "zcashnames",
  );
  assert.equal(
    PROVIDERS["custom:telegram"].getHandle({ preferred_username: "@ZcashNames" }),
    "ZcashNames",
  );
  assert.equal(PROVIDERS["custom:telegram"].getHandle({ name: "John Doe" }), null);
});
