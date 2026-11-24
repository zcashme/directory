import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy - Zcash.me",
  description: "Privacy policy for the Zcash.me verification service, including verification payments, memos, and one-time codes.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f6efe6] text-gray-900">
      <div className="max-w-3xl mx-auto p-6">
        <div className="mb-6">
          <Link href="/" className="text-[var(--color-brand-blue)] hover:underline">&larr; Back to Home</Link>
        </div>
        <h1 className="text-3xl font-bold mb-4 text-gray-900">Privacy Policy for Zcash Verification Service</h1>
        <p className="mb-4 text-sm text-gray-600">Last Updated: November 24, 2026</p>

        <div className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-2 text-gray-900">1. Information We Collect</h2>
            <p className="mb-2 text-gray-800">To provide our verification service, we collect the following information:</p>
            <ul className="list-disc pl-5 space-y-1 text-gray-800">
              <li><strong>Social media platforms:</strong> Your public handles and unique User ID (via OAuth), when you connect a social account to a Zcash.me profile. We do not access your posts, DMs, or password.</li>
              <li><strong>Zcash address:</strong> The Unified Address included in a verification memo, or the address on a Zcash.me profile. We do not receive your private keys or seed phrase, and we do not see the rest of your wallet balance or history.</li>
              <li><strong>Verification payment:</strong> A shielded payment you send to the verification service, including its transaction id, the amount shown on the requesting page, and the memo. Because our service wallet receives that payment, it can read the memo.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2 text-gray-900">2. Verification payments and memos</h2>
            <p className="mb-2 text-gray-800">
              A verification request is a shielded Zcash payment to the verification service. The page that starts the check generates the memo. The memo contains a numeric session identifier and the Unified Address that should receive the reply. You send the payment from your wallet with that memo unchanged.
            </p>
            <p className="mb-2 text-gray-800">
              The service reads the memo, computes a one-time code for that session and address, and sends the code back in a shielded payment to the address in the memo. The reply memo contains the code. It does not contain your other balances or transaction history.
            </p>
            <p className="text-gray-800">
              On Zcash.me, this check proves control of the address for a profile, including a profile backed by a Zcash Name. The amount is the amount shown in the verification step. A Zcash Name profile uses a 48-digit session. Other profile checks may use a shorter session and a higher minimum amount.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2 text-gray-900">3. Checks started on Zcash Names</h2>
            <p className="mb-2 text-gray-800">
              The Zcash Names referral dashboard uses this same service. Zcash Names generates the memo for the name&apos;s current Unified Address. You send 0.0001 ZEC, plus your wallet fee, to the verification service with that memo. We reply to that address with a one-time code.
            </p>
            <p className="text-gray-800">
              That payment does not move the name, edit a Zcash.me profile, or pay a referral reward. Zcash Names decides what the code unlocks on its own site and keeps its own record of the check. Its privacy policy describes those records. This policy covers what the verification service sees and sends: the request memo, the payment our wallet receives, and the reply that carries the code.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2 text-gray-900">4. How We Use Your Data</h2>
            <p className="mb-2 text-gray-800">We use this data to:</p>
            <ul className="list-disc pl-5 space-y-1 text-gray-800">
              <li>Confirm that the wallet for the address in the memo can receive the one-time code.</li>
              <li>Send that code, and reconcile the verification wallet.</li>
              <li>On Zcash.me, mark a profile verified and apply profile edits you submit with a successful check.</li>
              <li>Verify that a specific handle belongs to the owner of a specific Zcash address, and display that status when you ask us to.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2 text-gray-900">5. Data Storage</h2>
            <p className="text-gray-800">
              Profile and verification records are stored using Supabase. We may also keep an operational record of a verification request, including its transaction id, memo, address, and time, so we can deliver the code and reconcile the wallet. We do not sell, trade, or rent your personal information. A shielded payment that has already been sent stays on the Zcash network. We cannot delete it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2 text-gray-900">6. Data Removal</h2>
            <p className="text-gray-800">
              You may request deletion of a Zcash.me verification or profile record by contacting us. That request does not delete the verification payment or the reply already sent on chain, and it does not delete records that Zcash Names keeps for a referral-dashboard check.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2 text-gray-900">7. Contact</h2>
            <p className="text-gray-800">If you have questions, please contact us at james@zcash.me.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
