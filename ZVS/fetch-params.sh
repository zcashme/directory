#!/bin/bash
# Download Zcash Sapling proving parameters

set -e

PARAMS_DIR="${HOME}/.zcash-params"
SPEND_URL="https://download.z.cash/downloads/sapling-spend.params"
OUTPUT_URL="https://download.z.cash/downloads/sapling-output.params"

mkdir -p "$PARAMS_DIR"

echo "Downloading Zcash Sapling parameters to $PARAMS_DIR"
echo

if [ -f "$PARAMS_DIR/sapling-spend.params" ]; then
    echo "sapling-spend.params already exists, skipping"
else
    echo "Downloading sapling-spend.params (~47MB)..."
    curl -L --progress-bar -o "$PARAMS_DIR/sapling-spend.params" "$SPEND_URL"
fi

if [ -f "$PARAMS_DIR/sapling-output.params" ]; then
    echo "sapling-output.params already exists, skipping"
else
    echo "Downloading sapling-output.params (~3.5MB)..."
    curl -L --progress-bar -o "$PARAMS_DIR/sapling-output.params" "$OUTPUT_URL"
fi

echo
echo "Done. Parameters saved to $PARAMS_DIR"
ls -lh "$PARAMS_DIR"
