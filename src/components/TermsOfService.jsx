import React from 'react';
import { Link } from 'react-router-dom';

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-[#f6efe6] text-gray-900">
      <div className="max-w-3xl mx-auto p-6">
        <div className="mb-6">
          <Link to="/" className="text-blue-600 hover:underline">&larr; Back to Home</Link>
        </div>
        <h1 className="text-3xl font-bold mb-4 text-gray-900">Terms of Service</h1>

        <div className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-2 text-gray-900">1. Acceptance of Terms</h2>
            <p className="text-gray-800">By linking your Twitter account to your Zcash address on this platform, you agree to these Terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2 text-gray-900">2. Description of Service</h2>
            <p className="text-gray-800">This service provides a mechanism to publicly associate a Twitter identity with a Zcash address. It is provided "as is" and "as available".</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2 text-gray-900">3. User Responsibility</h2>
            <p className="text-gray-800">You certify that you are the owner of both the Twitter account and the Zcash address you are linking. You agree not to use this service for impersonation or deceptive practices.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2 text-gray-900">4. Disclaimer</h2>
            <p className="text-gray-800">We make no warranties regarding the uptime or accuracy of the verification service. We are not responsible for any losses associated with the use of this tool.</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
