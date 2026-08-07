import { randomBytes, createHash } from 'crypto';

// This script tests the full OIDC flow LOCALLY!
const ISSUER = "http://localhost:3001";
const CLIENT_ID = "pgpz";
const REDIRECT_URI = "http://localhost:3000/api/auth/callback/zcashme";
const USER_ID = "PGPZ-TEST" + randomBytes(3).toString('hex'); // Simulated PGPZ verification code

const codeVerifier = randomBytes(32).toString('base64url');
const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
const state = randomBytes(16).toString('base64url');
const nonce = randomBytes(16).toString('base64url');

console.log("=== OIDC Local Test Flow ===");
console.log("User ID (simulated PGPZ code):", USER_ID);
console.log("");

// Step 1: Start the auth request
const authUrl = new URL(`${ISSUER}/auth`);
authUrl.searchParams.set('client_id', CLIENT_ID);
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', 'openid profile');
authUrl.searchParams.set('state', state);
authUrl.searchParams.set('nonce', nonce);
authUrl.searchParams.set('code_challenge', codeChallenge);
authUrl.searchParams.set('code_challenge_method', 'S256');
authUrl.searchParams.set('user_id', USER_ID); // ← This triggers the profile editor + app link

console.log("1. Start your server with: npm run dev");
console.log("\n2. Open this URL in your browser:");
console.log(authUrl.toString());
console.log("\n3. You'll see:");
console.log("   - Step 1: Enter a ZcashMe username");
console.log("   - Step 2: Profile editor (display name, bio, links)");
console.log("            + a locked PGPZ link with code: " + USER_ID);
console.log("   - Step 3: QR code for Zcash payment + OTP entry");
console.log("   - Step 4: Redirect back to PGPZ callback (will 404 if PGPZ isn't running)");
console.log("\n4. To get the OTP for testing, run in another terminal:");
console.log("   npx tsx get-otp.ts 'DO NOT MODIFY:{zvs/XXXXXXXXXXXXXXXX,<zcash_address>}'");
console.log("   (copy the memo from the QR code's zcash: URI)");
console.log("\n5. Code verifier (for token exchange if you want to test that too):");
console.log("   " + codeVerifier);