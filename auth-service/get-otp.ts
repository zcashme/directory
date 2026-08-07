import crypto from "node:crypto";


function parseZvsMemo(memo: string) {
  const match = memo.match(/\{zvs\/(\d{16}),(.+)\}/);
  if (!match) return null;
  return { sessionId: match[1], userAddress: match[2] };
}

function getExpectedOtp(memo: string): string {
  const seedHex = process.env.ZVS_SECRET_SEED;
  if (!seedHex) {
    throw new Error("ZVS_SECRET_SEED is missing from your .env file!");
  }
  
  const parsed = parseZvsMemo(memo);
  if (!parsed) {
    throw new Error("Invalid memo format. Make sure it matches 'DO NOT MODIFY:{zvs/1234,address}'");
  }

  const message = Buffer.concat([
    Buffer.from(parsed.sessionId, "utf8"),
    Buffer.from(parsed.userAddress, "utf8"),
  ]);

  const hash = crypto.createHmac("sha256", Buffer.from(seedHex, "hex")).update(message).digest();
  const code = hash.readUInt32BE(0) >>> 0;
  return (code % 1000000).toString().padStart(6, "0");
}

const memo = process.argv[2];
if (!memo) {
  console.error("Usage: npx tsx get-otp.ts 'DO NOT MODIFY:{zvs/...}'");
  process.exit(1);
}

try {
  const otp = getExpectedOtp(memo);
  console.log(`\n✅ Generated OTP for testing: ${otp}\n`);
} catch (err: any) {
  console.error(`\n❌ Error: ${err.message}\n`);
}
