import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service - Zcash.me",
  description: "Terms of service for Zcash.me.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#f6efe6] text-gray-900">
      <div className="max-w-3xl mx-auto p-6">
        <div className="mb-6">
          <Link href="/" className="text-[var(--color-brand-blue)] hover:underline">&larr; Back to Home</Link>
        </div>
        <h1 className="text-3xl font-bold mb-4 text-gray-900">Terms of Service</h1>
        <p className="mb-2 text-sm text-gray-600">Effective Date: February 4, 2026</p>
        <p className="mb-6 text-sm text-gray-600">Last Updated: February 4, 2026</p>

        <div className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-2 text-gray-900">1. Introduction and Acceptance of Terms</h2>
            <p className="text-gray-800 mb-2">
              Welcome to zcash.me (the "Website" or "Service"), a community-operated directory that allows public association of social media accounts with Zcash (ZEC) addresses and provides tools to facilitate Zcash transactions.
            </p>
            <p className="text-gray-800 mb-2">
              By accessing, browsing, or using the Service (including submitting a linking request, viewing listings, or generating transaction links/QR codes), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, you must not use the Service.
            </p>
            <p className="text-gray-800">
              We reserve the right to modify these Terms at any time. Changes will be posted on the Website with an updated "Last Updated" date. Your continued use of the Service after changes constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2 text-gray-900">2. Description of the Service</h2>
            <p className="text-gray-800 mb-2">The Service provides:</p>
            <ul className="list-disc pl-5 space-y-1 text-gray-800 mb-2">
              <li>A public directory of social media accounts voluntarily associated with Zcash addresses.</li>
              <li>Optional verification badges (e.g., "Verified") based on proof of ownership submitted by users.</li>
              <li>Tools to generate Zcash transaction URIs or QR codes for sending ZEC to listed addresses.</li>
            </ul>
            <p className="text-gray-800 mb-2">
              The Service is provided on an "as is" and "as available" basis. We do not custody funds, process payments, or act as an intermediary in transactions. All transactions occur directly on the Zcash blockchain between users and recipients.
            </p>
            <p className="text-gray-800">
              We do not endorse, verify the identity of, or guarantee the legitimacy of any listed account or address.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2 text-gray-900">3. Eligibility</h2>
            <p className="text-gray-800">
              You must be at least 18 years old (or the age of legal majority in your jurisdiction) to use the Service. By using the Service, you represent that you meet this requirement and have the legal capacity to enter into these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2 text-gray-900">4. User Responsibilities and Submissions</h2>
            <p className="text-gray-800 mb-2">If you submit a request to link a social media account to a Zcash address or request verification:</p>
            <ul className="list-disc pl-5 space-y-1 text-gray-800 mb-2">
              <li>You certify and warrant that you are the lawful owner/control both the social media account and the Zcash address.</li>
              <li>You are solely responsible for the accuracy and validity of any submission or proof of ownership (e.g., signed message, post, or other verification method).</li>
              <li>You agree not to use the Service for impersonation, fraud, deception, or any unlawful purpose.</li>
            </ul>
            <p className="text-gray-800 mb-2">When using transaction tools:</p>
            <ul className="list-disc pl-5 space-y-1 text-gray-800">
              <li>You are solely responsible for verifying the recipient address and transaction details.</li>
              <li>Cryptocurrency transactions are irreversible. We are not responsible for funds sent to incorrect or fraudulent addresses.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2 text-gray-900">5. Prohibited Activities</h2>
            <p className="text-gray-800 mb-2">You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1 text-gray-800 mb-2">
              <li>Use the Service for illegal activities, fraud, impersonation, or harassment.</li>
              <li>Submit false, misleading, or unauthorized associations.</li>
              <li>Interfere with the Service (e.g., DDoS, scraping beyond fair use, or automated abuse).</li>
              <li>Violate any applicable laws or third-party rights.</li>
            </ul>
            <p className="text-gray-800">
              We may remove listings, deny verification, or block access at our sole discretion if we believe these rules have been violated.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2 text-gray-900">6. Disclaimers</h2>
            <p className="text-gray-800 mb-2 font-semibold">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF ACCURACY, COMPLETENESS, UPTIME, SECURITY, OR FITNESS FOR A PARTICULAR PURPOSE.
            </p>
            <p className="text-gray-800 mb-2">We make no representations about:</p>
            <ul className="list-disc pl-5 space-y-1 text-gray-800 mb-2">
              <li>The accuracy or legitimacy of listed associations or verification badges.</li>
              <li>The availability or performance of the Zcash network.</li>
              <li>The safety or suitability of any listed address for receiving funds.</li>
            </ul>
            <p className="text-gray-800">
              Cryptocurrency transactions involve significant risk, including total loss of funds. You use the Service at your own risk.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2 text-gray-900">7. Limitation of Liability</h2>
            <p className="text-gray-800 mb-2 font-semibold">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE (INCLUDING OUR OPERATORS, CONTRIBUTORS, AND AFFILIATES) SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, CONSEQUENTIAL, SPECIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF FUNDS, DATA, OR PROFITS ARISING FROM YOUR USE OF THE SERVICE—EVEN IF ADVISED OF THE POSSIBILITY.
            </p>
            <p className="text-gray-800 mb-2">
              In no event shall our total liability exceed US$100 (or equivalent).
            </p>
            <p className="text-gray-800">
              Some jurisdictions do not allow certain limitations, so the above may not apply to you.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2 text-gray-900">8. Indemnification</h2>
            <p className="text-gray-800">
              You agree to indemnify, defend, and hold harmless the Service operators and contributors from any claims, damages, or expenses (including legal fees) arising from your use of the Service, your submissions, or your violation of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2 text-gray-900">9. Intellectual Property</h2>
            <p className="text-gray-800">
              All content on the Website (excluding user-submitted public associations) is owned by us or our licensors. By submitting an association, you grant us a worldwide, royalty-free, perpetual license to display it publicly on the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2 text-gray-900">10. Privacy and Data</h2>
            <p className="text-gray-800">
              The Service displays only publicly submitted data (social media account identifiers and Zcash addresses). We do not collect any personal information. Associations are public and permanent once listed.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2 text-gray-900">11. Termination</h2>
            <p className="text-gray-800">
              We may suspend or terminate your access to the Service at any time, without notice, for any reason.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2 text-gray-900">12. Governing Law and Dispute Resolution</h2>
            <p className="text-gray-800">
              These Terms shall be governed by the laws of the United States of America, without regard to conflict of law principles. Any disputes shall be resolved exclusively in the courts of the United States of America.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2 text-gray-900">13. Miscellaneous</h2>
            <ul className="list-disc pl-5 space-y-1 text-gray-800">
              <li>If any provision is unenforceable, the remainder remains in effect.</li>
              <li>These Terms constitute the entire agreement.</li>
              <li>No waiver of any term shall be deemed ongoing.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2 text-gray-900">14. Contact</h2>
            <p className="text-gray-800">
              For questions about these Terms or the Service, please contact: james@zcash.me
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
