import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "API Documentation - Zcash.me",
  description: "API documentation for Zcash.me directory.",
};

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-[#f6efe6] text-gray-900">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <Link href="/" className="text-[var(--color-brand-blue)] hover:underline">&larr; Back to Home</Link>
        </div>

        <h1 className="text-3xl font-bold mb-2 text-gray-900">API Documentation</h1>
        <p className="text-gray-600 mb-8">Reference for the Zcash.me directory API.</p>

        {/* Table of Contents */}
        <nav className="mb-10 p-4 bg-white/50 rounded-lg border border-gray-200">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Contents</h2>
          <ul className="space-y-2 text-sm">
            <li><a href="#directory-api" className="text-[var(--color-brand-blue)] hover:underline">Directory API</a></li>
            <li><a href="#health" className="text-[var(--color-brand-blue)] hover:underline">Health & Status</a></li>
          </ul>
        </nav>

        {/* Directory API Section */}
        <section id="directory-api" className="mb-12">
          <h2 className="text-2xl font-semibold mb-4 text-gray-900">Directory API</h2>
          <p className="text-gray-700 mb-6">
            The Directory API provides access to Zcash.me user profiles, addresses, and verified social links.
            For wallet integration documentation, see the{" "}
            <a href="https://github.com/zcashme/directory/blob/main/WALLET_API_README.md" className="text-[var(--color-brand-blue)] hover:underline" target="_blank" rel="noopener noreferrer">Wallet API Guide</a>.
          </p>

          <div className="space-y-6">
            {/* Lookup */}
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">
                <span className="text-green-600 font-mono text-sm">GET</span>{" "}
                <code className="text-sm bg-gray-100 px-2 py-1 rounded">/api/lookup/{"{username}"}</code>
              </h3>
              <p className="text-sm text-gray-600 mb-3">Public endpoint. Resolve a username to a Zcash address.</p>
              <details className="text-sm">
                <summary className="cursor-pointer text-[var(--color-brand-blue)] hover:underline">Response</summary>
                <pre className="mt-2 p-3 bg-gray-900 text-gray-100 rounded overflow-x-auto">
{`{
  "username": "alice",
  "display_name": "Alice",
  "address": "u1...",
  "address_verified": true
}`}
                </pre>
              </details>
            </div>

            {/* Resolve */}
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">
                <span className="text-green-600 font-mono text-sm">GET</span>{" "}
                <code className="text-sm bg-gray-100 px-2 py-1 rounded">/api/resolve/{"{username}"}</code>
              </h3>
              <p className="text-sm text-gray-600 mb-3">Full profile including links and verification status.</p>
              <details className="text-sm">
                <summary className="cursor-pointer text-[var(--color-brand-blue)] hover:underline">Response</summary>
                <pre className="mt-2 p-3 bg-gray-900 text-gray-100 rounded overflow-x-auto">
{`{
  "username": "alice",
  "display_name": "Alice",
  "profile_image_url": "https://...",
  "bio": "Zcash enthusiast",
  "nearest_city_name": "New York",
  "address": "u1...",
  "address_verified": true,
  "verified_at": "2025-10-23T10:58:54.721199+00:00",
  "authenticated_links": [
    { "id": 1, "label": "alice", "url": "https://x.com/alice", "platform": "X", "is_verified": true }
  ],
  "unauthenticated_links": []
}`}
                </pre>
              </details>
            </div>

            {/* Directory */}
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">
                <span className="text-green-600 font-mono text-sm">GET</span>{" "}
                <code className="text-sm bg-gray-100 px-2 py-1 rounded">/api/directory?q={"{query}"}&limit=25</code>
              </h3>
              <p className="text-sm text-gray-600 mb-3">Search and browse profiles. Supports pagination with cursor.</p>
            </div>

            {/* Social */}
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">
                <span className="text-green-600 font-mono text-sm">GET</span>{" "}
                <code className="text-sm bg-gray-100 px-2 py-1 rounded">/api/social?platform=x&handle={"{handle}"}</code>
              </h3>
              <p className="text-sm text-gray-600 mb-3">Find a Zcash address by social media handle.</p>
              <p className="text-xs text-gray-500">Supported platforms: x, twitter, github, instagram, reddit, linkedin, discord, tiktok, bluesky, mastodon, snapchat, telegram</p>
            </div>
          </div>
        </section>

        {/* Health Section */}
        <section id="health" className="mb-12">
          <h2 className="text-2xl font-semibold mb-4 text-gray-900">Health & Status</h2>

          <div className="space-y-6">
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">
                <span className="text-green-600 font-mono text-sm">GET</span>{" "}
                <code className="text-sm bg-gray-100 px-2 py-1 rounded">/api/health</code>
              </h3>
              <p className="text-sm text-gray-600 mb-3">Service health check. Returns status of Supabase directory and ZVS verification service.</p>
              <details className="text-sm">
                <summary className="cursor-pointer text-[var(--color-brand-blue)] hover:underline">Response</summary>
                <pre className="mt-2 p-3 bg-gray-900 text-gray-100 rounded overflow-x-auto">
{`{
  "status": "ok",
  "services": {
    "zcashme": { "status": "ok", "latency_ms": 0 },
    "directory": { "status": "ok", "latency_ms": 45 },
    "verifications": { "status": "ok", "latency_ms": 23 }
  }
}`}
                </pre>
              </details>
            </div>
          </div>
        </section>

        {/* Footer note */}
        <div className="mt-12 pt-6 border-t border-gray-200 text-sm text-gray-500">
          <p>
            For questions or to request an API key, contact:{" "}
            <a href="mailto:james@zcash.me" className="text-[var(--color-brand-blue)] hover:underline">james@zcash.me</a>
          </p>
        </div>
      </div>
    </div>
  );
}
