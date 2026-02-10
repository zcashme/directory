# Thread Feature Implementation

This document describes the implementation of the public message board thread feature for Zcash.me.

## Overview

The thread feature allows verified Zcash users to post public messages to a shared message board. Messages are authenticated through blockchain memos and OTP verification, ensuring sender identity.

## Architecture

### Database Schema

**Tables:**
- `thread_messages` - Public posted messages
- `pending_thread_messages` - Messages awaiting OTP confirmation

**RPC Functions:**
- `confirm_thread_otp_sql(zcasher_id, otp)` - Validates OTP and promotes pending message to public

See `schema.sql` for full SQL definitions.

### File Structure

```
lib/thread/
├── README.md                  # This file
├── schema.sql                 # Database schema (run in Supabase)
├── types.ts                   # TypeScript interfaces
├── buildThreadMemo.ts         # Memo format and validation
├── actions.ts                 # Server actions (startThreadMessage, confirmThreadOtp)
└── getMessages.ts             # Message fetching queries

app/thread-app/
├── page.tsx                   # Server wrapper (fetches initial messages)
└── ThreadPage.tsx             # Main client component

ui/thread/
├── MessageCard.tsx            # Individual message display
├── MessageFeed.tsx            # Message list with pagination
├── MessageComposer.tsx        # Message input + QR generation
└── ThreadOtpFlow.tsx          # OTP verification UI

lib/stores/
└── thread.ts                  # Zustand store for thread state

app/api/thread/messages/route.ts  # Public API endpoint
```

## User Flow

1. **View Thread Feed**
   - User visits `/thread-app`
   - Server fetches initial 50 messages
   - Feed displays with infinite scroll pagination

2. **Compose Message** (logged-in users only)
   - User enters message text
   - Client validates message size (max 512 bytes as memo)
   - User clicks "Post Message"

3. **Generate Signing Request**
   - Server creates pending message entry
   - Generates memo in format: `{z:ZCASHER_ID,t:"message text"}`
   - Builds Zcash URI for wallet signing
   - Displays QR code

4. **Sign with Wallet**
   - User scans QR or opens wallet
   - Sends 0 ZEC transaction with memo
   - Backend detects memo and generates OTP

5. **Enter OTP**
   - User receives OTP in wallet
   - Enters OTP in form
   - Server validates OTP and promotes message

6. **Message Published**
   - Message appears in feed with verified badge
   - Timestamp and user profile displayed

## Memo Format

Thread messages use JSON memo format:
```json
{z:123,t:"Hello from the thread!"}
```

- `z`: zcasher_id (numeric, required)
- `t`: message text (string, max ~400 chars)

**Size Limits:**
- Zcash memo field: 512 bytes max
- UTF-8 encoding: emojis use 3-4 bytes
- Safe message limit: 400 characters
- Component shows byte counter to users

**Validation:**
- Empty messages rejected
- Oversized messages show error before QR
- Backend stores memo_hash for tracking

## API Endpoints

### GET /api/thread/messages

Fetch public thread messages.

**Query Parameters:**
- `limit` (number, default 50, max 100)
- `offset` (number, default 0)
- `user_id` (optional, filter by user)

**Response:**
```typescript
{
  ok: boolean;
  data?: ThreadMessageWithProfile[];
  error?: string;
}
```

## Component Usage

### MessageComposer

Used to compose and sign messages.

```tsx
<MessageComposer profile={currentUserProfile} />
```

**Features:**
- Auto-resizing textarea
- Real-time byte counter
- QR code generation
- Wallet opening
- Size validation

### MessageFeed

Displays paginated message list with auto-refresh.

```tsx
<MessageFeed
  initialMessages={messages}
  onNewMessage={hasNewMessage}
/>
```

**Features:**
- Infinite scroll pagination
- Auto-reload every 30 seconds
- Load more button fallback
- Empty state message

### ThreadOtpFlow

Handles OTP entry and verification.

```tsx
<ThreadOtpFlow
  zcasherId={userId}
  onSuccess={() => handleRefresh()}
/>
```

**Features:**
- Waiting for transaction state
- OTP input form
- Confirmation loading
- Success/error messages

## Store State

The `useThreadStore` manages:
- `messageComposition` - Current message text
- `verifyQrEnabled` - Show/hide QR code
- `currentRequestId` - Active verification request
- `messages` - Fetched message list
- `isOtpFormOpen` - OTP input visibility
- `pollStatus` - Verification polling state

## Backend Integration

The verification service backend (`verification-service/api/verify_routes_rpc_zid_poll.py`) must be updated to:

1. **Detect thread memo format:**
   ```python
   memo_data = json.loads(memo_text)
   if 't' in memo_data:  # Thread message
       # Store in pending_thread_messages
   else:
       # Existing profile edit logic
   ```

2. **Store pending message:**
   ```python
   INSERT INTO pending_thread_messages (
       zcasher_id, request_id, message_text, memo_hash
   ) VALUES (...)
   ```

3. **Generate OTP:**
   - Same as existing profile edit flow
   - Send OTP to wallet/email

4. **Validation:**
   - Frontend calls `confirm_thread_otp_sql(zcasher_id, otp)`
   - Separate RPC from profile edits ensures isolation

## Security Considerations

1. **Message Authentication**
   - Messages verified through blockchain memo
   - OTP proves wallet ownership
   - User identity from Zcash profile

2. **XSS Prevention**
   - React auto-escapes message text
   - No HTML/markdown rendering
   - Plain text only

3. **Rate Limiting**
   - Reuses existing API rate limiting
   - One message per successful OTP

4. **OTP Single-Use**
   - Database enforces `otp_used = false`
   - Cannot reuse same OTP

## Message Cleanup

The `cleanupExpiredPendingMessagesAction()` server action deletes pending messages older than 1 hour.

**Implementation options:**
1. Manual: Call via admin endpoint periodically
2. Cron: Set up scheduled job in backend
3. Trigger: Supabase pg_cron extension

## Testing

### Manual End-to-End Testing

1. Navigate to `/thread-app`
2. Verify message feed loads
3. Log in (create test profile)
4. Enter test message
5. Click "Post Message" → QR appears
6. Scan QR with Zcash wallet
7. Send 0 ZEC transaction with memo
8. Watch polling indicator
9. Receive OTP
10. Enter OTP
11. Message appears in feed

### Edge Cases

- [ ] Message too long → error shown
- [ ] Invalid OTP → retry allowed
- [ ] Expired OTP → clear error
- [ ] Network error → retry mechanism
- [ ] Profile deleted → "Anonymous" display
- [ ] Pagination → "Load more" works
- [ ] Auto-refresh → new messages appear
- [ ] Multiple users → messages ordered by time

## Future Enhancements

Out of scope for current implementation:

- Replies/threading (add `parent_id`)
- Reactions (👍, ❤️)
- Mentions (@username)
- Message editing
- Message deletion
- Rich text/markdown
- Image attachments
- Search functionality
- Moderation tools
- Direct messaging

## Troubleshooting

### Messages not loading
- Check Supabase connection
- Verify RLS policies on tables
- Check browser console for errors

### OTP not received
- Verify backend is detecting memo correctly
- Check OTP generation in backend
- Verify wallet is receiving transaction

### Message size errors
- Remember UTF-8 encoding (not char count)
- Emojis use 3-4 bytes each
- Max safe: 400 characters
- Exact limit shown in UI

### Profile not found
- Verify user is logged in
- Check email format matches Zcash profile
- Ensure profile exists in database

## Development Notes

- Uses existing verification polling infrastructure
- Reuses QR code generation from messaging system
- Integrates with existing profile system
- Follows established code patterns (Zustand, server actions, RLS)
- Minimal backend changes required
- Maximum component reuse from existing codebase
