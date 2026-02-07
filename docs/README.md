# Documentation

This folder contains testing and integration documentation for zcash.me features.

## 1Click Swap Integration

Documentation for testing the ANY token → ZEC swap feature using the 1Click API.

### Quick Start

**New to testing this feature?** Start here:

1. **[TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md)** - Step-by-step testing checklist
   - Simple checkbox format
   - UI testing steps
   - Error scenarios
   - Real swap preparation

### Comprehensive Guides

2. **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** - Complete testing reference
   - Detailed testing phases
   - Debugging tips
   - Common issues and solutions
   - Full API endpoint documentation

3. **[FLOW_DIAGRAM.md](./FLOW_DIAGRAM.md)** - Visual documentation
   - Flow diagrams showing the swap process
   - File relationships
   - Data structures
   - Implementation details

### Feature Overview

**What it does:** Allows users to swap any supported token (BTC, ETH, USDC, USDT, SOL) to Zcash (ZEC) using the NEAR Intents 1Click API.

**Key Features:**
- Quote generation with slippage tolerance
- Deposit address generation with QR codes
- "I've Sent Funds" button navigation to status page
- Adaptive status polling (1s → 5s intervals)
- Public swap tracking at `/swap?depositAddress=...`

### Key Files

| Feature | File | Description |
|---------|------|-------------|
| API Client | `/lib/swap/oneClick.js` | 1Click API integration |
| Payload Builder | `/lib/swap/swapPayload.js` | Quote payload construction |
| Quote Action | `/lib/swap/quoteAction.js` | Server action for quotes |
| Confirm Action | `/lib/swap/confirmAction.js` | Server action for confirmation |
| State Management | `/app/[slug]/providers/swap-provider.jsx` | SwapContext provider |
| Quote Form | `/ui/swap/SwapComposer.jsx` | User input form |
| Deposit Display | `/ui/swap/SwapDepositDisplay.jsx` | QR code & instructions |
| Status Page | `/app/swap/page.jsx` | Public swap tracking |
| Status API | `/app/api/swap/status/route.js` | Status polling endpoint |

### Quick Commands

```bash
# Start dev server
npm run dev

# View the testing checklist
cat docs/TESTING_CHECKLIST.md

# Test API connectivity
curl -H "Authorization: Bearer $ONECLICK_API_KEY" \
  https://1click.chaindefuser.com/v0/tokens

# Check for errors in logs
npm run dev 2>&1 | grep -i error
```

### External Resources

- **1Click API Docs:** https://1click.chaindefuser.com/
- **Partners Portal:** https://partners.near-intents.org/
- **OpenAPI Spec:** https://1click.chaindefuser.com/docs/v0/openapi.yaml

---

**Need help?** Check the [TESTING_GUIDE.md](./TESTING_GUIDE.md) for detailed troubleshooting.
