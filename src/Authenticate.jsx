import React from "react";

export default function Authenticate() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Authenticate with Zcash</h1>
      <p className="text-gray-600">
        This page will generate a wallet-ready ZIP-321 payment URI and QR code for verification.
      </p>
    </div>
  );
}
