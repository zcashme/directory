import { randomBytes, createHash } from 'crypto';

// This script tests the full OIDC flow LOCALLY!
const ISSUER = "http://localhost:3001";
const CLIENT_ID = "pgpz"; // Using the client ID you probably inserted
const REDIRECT_URI = "http://localhost:3000/api/auth/callback/zcashme";

const codeVerifier = randomBytes(32).toString('base64url');
const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
const state = randomBytes(16).toString('base64url');
const nonce = randomBytes(16).toString('base64url');

console.log("=== OIDC Local Test Flow ===");

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

console.log("\n1. Start your server with: npm run dev");
console.log("\n2. Then open this URL in your browser to see the beautiful new UI connected to the backend:");
console.log(authUrl.toString());

console.log("\n3. After you finish the login, you will be redirected to localhost:3000 (which will error if your PGPZ app isn't running, but you'll see the ?code= in the URL!).");
