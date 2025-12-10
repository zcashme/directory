import React from 'react';
import { Link } from 'react-router-dom';

const TermsOfService = () => {
  return (
    <div className="max-w-3xl mx-auto p-6 text-gray-800 dark:text-gray-200">
      <div className="mb-6">
        <Link to="/" className="text-blue-600 hover:underline dark:text-blue-400">&larr; Back to Home</Link>
      </div>
      <h1 className="text-3xl font-bold mb-4">Terms of Service</h1>

      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-2">1. Acceptance of Terms</h2>
          <p>By linking your Twitter account to your Zcash address on this platform, you agree to these Terms.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">2. Description of Service</h2>
          <p>This service provides a mechanism to publicly associate a Twitter identity with a Zcash address. It is provided "as is" and "as available".</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">3. User Responsibility</h2>
          <p>You certify that you are the owner of both the Twitter account and the Zcash address you are linking. You agree not to use this service for impersonation or deceptive practices.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">4. Disclaimer</h2>
          <p>We make no warranties regarding the uptime or accuracy of the verification service. We are not responsible for any losses associated with the use of this tool.</p>
        </section>
      </div>
    </div>
  );
};

export default TermsOfService;
