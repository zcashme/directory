import { randomBytes, createHash } from 'crypto';

// This script tests the full OIDC flow in production!
const ISSUER = "https://auth.zcash.me";
const CLIENT_ID = "test-client-123";
const REDIRECT_URI = "http://localhost:3000/callback";

const codeVerifier = randomBytes(32).toString('base64url');
const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
const state = randomBytes(16).toString('base64url');
const nonce = randomBytes(16).toString('base64url');

console.log("=== OIDC Production Test Flow ===");

// Step 1: Start the auth request
const authUrl = new URL(`${ISSUER}/auth`);
authUrl.searchParams.set('client_id', CLIENT_ID);
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', 'openid profile email');
authUrl.searchParams.set('state', state);
authUrl.searchParams.set('nonce', nonce);
authUrl.searchParams.set('code_challenge', codeChallenge);
authUrl.searchParams.set('code_challenge_method', 'S256');

console.log("\n1. Visit this URL to log in (or curl it to see the redirect to the interaction page):");
console.log(authUrl.toString());

console.log("\n2. The login page will eventually redirect you to:");
console.log(`${REDIRECT_URI}?code=AUTHORIZATION_CODE&state=${state}`);

console.log("\n3. To exchange the code for tokens, run this command (replace YOUR_CODE_HERE):");
console.log(`curl -X POST \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "grant_type=authorization_code" \\
  -d "client_id=${CLIENT_ID}" \\
  -d "code_verifier=${codeVerifier}" \\
  -d "redirect_uri=${REDIRECT_URI}" \\
  -d "code=YOUR_CODE_HERE" \\
  ${ISSUER}/token | node -e "console.log(JSON.parse(require('fs').readFileSync(0,'utf8')))"`);
