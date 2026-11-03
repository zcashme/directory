import assert from "node:assert/strict";
import test from "node:test";
import { getLinkAuthenticatedLabel, stripLinkProtocol } from "./profileUtils.ts";

test("getLinkAuthenticatedLabel uses month and year", () => {
  assert.equal(getLinkAuthenticatedLabel("2025-10-23T10:58:54.721Z"), "Authenticated Oct 2025");
});

test("getLinkAuthenticatedLabel falls back without a timestamp", () => {
  assert.equal(getLinkAuthenticatedLabel(null), "Authenticated");
  assert.equal(getLinkAuthenticatedLabel(undefined), "Authenticated");
  assert.equal(getLinkAuthenticatedLabel(""), "Authenticated");
  assert.equal(getLinkAuthenticatedLabel("not-a-date"), "Authenticated");
});

test("stripLinkProtocol drops https and www", () => {
  assert.equal(stripLinkProtocol("https://www.t.me/zcashnames"), "t.me/zcashnames");
  assert.equal(stripLinkProtocol("https://t.me/zcashnames"), "t.me/zcashnames");
  assert.equal(stripLinkProtocol("http://www.github.com/Electric-Coin-Company"), "github.com/Electric-Coin-Company");
});

test("stripLinkProtocol keeps path, query, and hash", () => {
  assert.equal(
    stripLinkProtocol("https://www.example.com/path/?q=1#top"),
    "example.com/path?q=1#top",
  );
});

test("stripLinkProtocol strips a trailing slash on the path", () => {
  assert.equal(stripLinkProtocol("https://www.example.com/"), "example.com");
  assert.equal(stripLinkProtocol("https://t.me/zcashnames/"), "t.me/zcashnames");
});

test("stripLinkProtocol returns empty for blank input", () => {
  assert.equal(stripLinkProtocol(""), "");
  assert.equal(stripLinkProtocol("   "), "");
});
