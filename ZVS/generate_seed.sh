#!/bin/bash
# Generate a random 32-byte (64 hex character) seed for ZVS

SEED_FILE="seed.txt"

# Generate 32 random bytes and convert to hex
SEED_HEX=$(openssl rand -hex 32)

# Write to file
echo "$SEED_HEX" > "$SEED_FILE"

echo "Generated SEED_HEX and saved to $SEED_FILE"
echo "Seed: $SEED_HEX"
echo ""
echo "WARNING: Keep this seed secure! Anyone with this seed can spend your funds."
