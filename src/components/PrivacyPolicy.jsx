import React from "react";
import Link from "next/link";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-[#f6efe6] text-gray-900">
      <div className="max-w-3xl mx-auto p-6">
        <div className="mb-6">
          <Link href="/" className="text-blue-600 hover:underline">&larr; Back to Home</Link>
        </div>
        <h1 className="text-3xl font-bold mb-4 text-gray-900">Privacy Policy for Zcash Verification Service</h1>
        <p className="mb-4 text-sm text-gray-600">Last Updated: December 10, 2025</p>

        <div className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-2 text-gray-900">1. Information We Collect</h2>
            <p className="mb-2 text-gray-800">To provide our verification service, we collect the following information:</p>
            <ul className="list-disc pl-5 space-y-1 text-gray-800">
              <li><strong>Twitter/X Information:</strong> Your public Twitter handle and unique User ID (via OAuth). We do NOT access your tweets, DMs, or password.</li>
              <li><strong>Zcash Information:</strong> Your public Zcash Unified Address or Shielded Address.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2 text-gray-900">2. How We Use Your Data</h2>
            <p className="mb-2 text-gray-800">We use this data solely to:</p>
            <ul className="list-disc pl-5 space-y-1 text-gray-800">
              <li>Verify that a specific Twitter handle belongs to the owner of a specific Zcash address.</li>
              <li>Display this verification status publicly as requested by you.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2 text-gray-900">3. Data Storage</h2>
            <p className="text-gray-800">Your data is stored securely using Supabase. We do not sell, trade, or rent your personal identification information to others.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2 text-gray-900">4. Data Removal</h2>
            <p className="text-gray-800">You may request the deletion of your verification record at any time by contacting us.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2 text-gray-900">5. Contact</h2>
            <p className="text-gray-800">If you have questions, please contact us at james.edaclinical.com.</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
