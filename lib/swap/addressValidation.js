/**
 * Validates addresses based on blockchain type
 */

export function validateAddressForBlockchain(address, blockchain) {
  if (!address || !blockchain) {
    return { valid: false, error: "Address and blockchain are required." };
  }

  const chain = String(blockchain).toLowerCase().trim();

  // BTC validation
  if (chain.includes("btc")) {
    return validateBtcAddress(address);
  }

  // ETH validation
  if (chain.includes("eth") || chain.includes("ethereum")) {
    return validateEthAddress(address);
  }

  // SOL validation
  if (chain.includes("sol")) {
    return validateSolAddress(address);
  }

  // NEAR validation
  if (chain.includes("near")) {
    return validateNearAddress(address);
  }

  // ZEC validation
  if (chain.includes("zec")) {
    return validateZecAddress(address);
  }

  // For unknown blockchains, accept any non-empty address
  return { valid: true };
}

function validateBtcAddress(address) {
  if (!address || typeof address !== "string") {
    return { valid: false, error: "Bitcoin address must be a string." };
  }

  // BTC addresses: P2PKH (starts with 1), P2SH (starts with 3), or Bech32 (starts with bc1)
  const isValid = /^(1[1-9A-HJ-NP-Z]{24,33}|3[1-9A-HJ-NP-Z]{24,33}|bc1[a-z0-9]{39,59})$/.test(
    address
  );

  if (!isValid) {
    return { valid: false, error: "Invalid Bitcoin address format." };
  }

  return { valid: true };
}

function validateEthAddress(address) {
  if (!address || typeof address !== "string") {
    return { valid: false, error: "Ethereum address must be a string." };
  }

  // ETH addresses are 42 chars (0x + 40 hex chars)
  const isValid = /^0x[a-fA-F0-9]{40}$/.test(address);

  if (!isValid) {
    return { valid: false, error: "Invalid Ethereum address format." };
  }

  return { valid: true };
}

function validateSolAddress(address) {
  if (!address || typeof address !== "string") {
    return { valid: false, error: "Solana address must be a string." };
  }

  // SOL addresses are base58 encoded and typically 44 characters
  const isValid = /^[1-9A-HJ-NP-Z]{44}$/.test(address);

  if (!isValid) {
    return { valid: false, error: "Invalid Solana address format." };
  }

  return { valid: true };
}

function validateNearAddress(address) {
  if (!address || typeof address !== "string") {
    return { valid: false, error: "NEAR address must be a string." };
  }

  // NEAR addresses are alphanumeric with hyphens, between 2 and 64 characters
  const isValid = /^[a-z0-9._-]{2,64}$/.test(address);

  if (!isValid) {
    return { valid: false, error: "Invalid NEAR address format." };
  }

  return { valid: true };
}

function validateZecAddress(address) {
  if (!address || typeof address !== "string") {
    return { valid: false, error: "Zcash address must be a string." };
  }

  // ZEC addresses can be transparent (starts with t1/t3) or shielded (starts with z)
  const isValid = /^(t1[1-9A-HJ-NP-Z]{24,33}|t3[1-9A-HJ-NP-Z]{24,33}|z[a-z0-9]{76})$/.test(
    address
  );

  if (!isValid) {
    return { valid: false, error: "Invalid Zcash address format." };
  }

  return { valid: true };
}
