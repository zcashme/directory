"use client";

import CopyButton from "@/ui/common/buttons/CopyButton";

interface ZnsIdentityPageProps {
  name: string;
  address: string;
  txid?: string | null;
}

export default function ZnsIdentityPage({ name, address, txid }: ZnsIdentityPageProps) {
  const joinHref = `/?join=1&username=${encodeURIComponent(name)}`;

  return (
    <div className="w-full min-h-screen">
      <div className="relative max-w-xl mx-auto p-4 pb-24 pt-16">
        <div className="rounded-[26px] border border-gray-300 bg-white p-6 text-center shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Zcash Name</p>
          <h1 className="mt-2 text-2xl font-semibold text-gray-900">{name}</h1>
          <p className="mt-3 text-sm text-gray-600">
            This name is claimed on-chain. It is not linked to an existing Zcash.me profile
            because the resolved address does not match a same-name profile.
          </p>
          <div className="mt-5 rounded-2xl border border-black/10 bg-gray-50 px-3 py-3 text-left">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Resolved address</p>
            <div className="mt-2 flex items-start gap-2">
              <p className="flex-1 break-all font-mono text-xs text-gray-800">{address}</p>
              <CopyButton text={address} />
            </div>
          </div>
          {txid ? (
            <p className="mt-3 break-all text-xs text-gray-500">Registration txid: {txid}</p>
          ) : null}
          <a
            href={joinHref}
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-[var(--color-brand-blue)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Create a Zcash.me profile
          </a>
        </div>
      </div>
    </div>
  );
}
