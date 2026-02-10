# Thread Feature: Backend Integration Guide

This document describes the changes needed in the verification service backend to support the thread messaging feature.

## Overview

The thread feature allows users to post messages via blockchain memos and OTP verification. The backend verification service needs to:

1. Detect thread messages in memo field
2. Store pending messages in `pending_thread_messages` table
3. Generate OTP for message verification
4. Send OTP to user

## Database Tables

Two new tables have been created in Supabase:

```sql
-- Public messages
CREATE TABLE thread_messages (
  id BIGSERIAL PRIMARY KEY,
  zcasher_id INTEGER REFERENCES zcasher_searchable(id),
  message_text TEXT NOT NULL,
  memo_hash TEXT,
  tx_id TEXT,
  request_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  is_visible BOOLEAN DEFAULT true
);

-- Pending messages (awaiting OTP)
CREATE TABLE pending_thread_messages (
  id BIGSERIAL PRIMARY KEY,
  zcasher_id INTEGER NOT NULL REFERENCES zcasher_searchable(id),
  request_id TEXT NOT NULL UNIQUE,
  message_text TEXT NOT NULL,
  memo_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 hour'
);
```

Run `lib/thread/schema.sql` in Supabase SQL editor to create these tables and the RPC function.

## RPC Function

A new RPC function has been created:

```sql
confirm_thread_otp_sql(in_zcasher_id INTEGER, in_otp TEXT)
```

This function:
- Validates the OTP (integration point with your OTP validation)
- Finds the most recent pending message for the user
- Promotes it to `thread_messages` table
- Sets `verified_at` timestamp
- Deletes the pending message
- Returns status and message_id

**Returns:**
```sql
TABLE (status TEXT, message TEXT, message_id BIGINT)
```

**Status values:**
- `"confirmed"` - Message posted successfully
- `"invalid"` - Invalid OTP
- `"expired"` - No pending message or message expired
- `"error"` - Server error

## Backend Changes Required

### File: `verification-service/api/verify_routes_rpc_zid_poll.py`

**Current behavior:**
- Detects profile edit memos: `{z:ZID} rid:REQUEST_ID {b:"bio",n:"name",...}`
- Stores in `pending_zcasher_edits` table
- Generates OTP and sends to wallet

**New behavior needed:**
- Also detect thread message memos: `{z:ZID,t:"message text"}`
- Store in `pending_thread_messages` table
- Same OTP generation/sending logic

### Implementation

#### 1. Parse memo and detect thread format

```python
import json

def parse_memo(memo_text: str) -> dict:
    """Parse memo to detect type (thread or profile edit)"""
    try:
        memo_data = json.loads(memo_text)
        return memo_data
    except json.JSONDecodeError:
        return {}

def is_thread_message(memo_data: dict) -> bool:
    """Check if memo is a thread message"""
    return 't' in memo_data and 'z' in memo_data

def is_profile_edit(memo_data: dict) -> bool:
    """Check if memo is a profile edit"""
    return 'rid' in memo_data  # Contains request ID for profile edits
```

#### 2. Store pending message

```python
async def store_pending_thread_message(
    zcasher_id: int,
    request_id: str,
    message_text: str,
    memo_hash: str,
    db_connection
) -> bool:
    """Store pending thread message in database"""
    query = """
    INSERT INTO pending_thread_messages
    (zcasher_id, request_id, message_text, memo_hash)
    VALUES ($1, $2, $3, $4)
    """
    try:
        await db_connection.execute(
            query,
            zcasher_id,
            request_id,
            message_text,
            memo_hash
        )
        return True
    except Exception as e:
        logger.error(f"Error storing pending thread message: {e}")
        return False
```

#### 3. Update memo detection logic

In your existing memo detection function, add thread message handling:

```python
async def handle_detected_memo(
    memo_data: dict,
    tx_id: str,
    zcasher_id: int,
    request_id: str,
    db_connection
) -> str:
    """
    Handle detected memo for either profile edit or thread message
    Returns: 'thread' or 'profile_edit' or 'unknown'
    """

    # Check if thread message
    if is_thread_message(memo_data):
        message_text = memo_data.get('t', '')

        # Validate message
        if not message_text or len(message_text.encode('utf-8')) > 400:
            logger.warning(f"Invalid thread message: {message_text}")
            return 'unknown'

        # Create memo hash for tracking
        memo_hash = base64.b64encode(
            json.dumps(memo_data).encode()
        ).decode()

        # Store pending message
        success = await store_pending_thread_message(
            zcasher_id,
            request_id,
            message_text,
            memo_hash,
            db_connection
        )

        if success:
            logger.info(f"Stored pending thread message from {zcasher_id}")
            return 'thread'
        else:
            return 'unknown'

    # Check if profile edit (existing logic)
    elif is_profile_edit(memo_data):
        # ... existing profile edit handling ...
        return 'profile_edit'

    return 'unknown'
```

#### 4. Generate and send OTP (reuse existing)

The OTP generation and sending should be identical to profile edits:

```python
async def send_otp_for_message(
    request_id: str,
    zcasher_id: int,
    message_type: str  # 'thread' or 'profile_edit'
) -> bool:
    """Generate and send OTP to user"""

    # Existing OTP generation code (reuse)
    otp = generate_otp()  # Your existing function

    # Store OTP in appropriate table based on message type
    if message_type == 'thread':
        # Store OTP linked to request_id (for polling)
        await store_otp(request_id, otp, 'thread')
    else:
        # Existing profile edit OTP storage
        await store_otp(request_id, otp, 'profile_edit')

    # Send OTP to wallet (reuse existing)
    await send_otp_to_wallet(zcasher_id, otp)

    return True
```

#### 5. Update polling response

When frontend polls `/verify/poll/{requestId}/status`, include memo detection:

```python
async def get_poll_status(request_id: str):
    """Get status of verification request"""

    # ... existing code ...

    status = {
        'request_id': request_id,
        'status': current_status,  # waiting, memo_received, otp_sent, confirmed
        'otp_status': otp_status,
        'otp_phase': otp_phase,
        'message_type': message_type  # 'thread', 'profile_edit', or None
    }

    return status
```

## Integration Checklist

- [ ] Create database tables from `lib/thread/schema.sql`
- [ ] Add thread message detection to memo parser
- [ ] Implement `store_pending_thread_message()` function
- [ ] Update `handle_detected_memo()` to detect thread format
- [ ] Reuse existing OTP generation for thread messages
- [ ] Update polling response to indicate message type
- [ ] Test with frontend at `/thread-app`
- [ ] Verify OTP delivery to wallet
- [ ] Verify message promotion to `thread_messages`
- [ ] Test expired message cleanup

## Testing Backend Changes

### 1. Unit Tests

Test memo parsing:
```python
def test_parse_thread_memo():
    memo = '{"z":123,"t":"Hello world"}'
    data = parse_memo(memo)
    assert is_thread_message(data) == True
```

Test invalid messages:
```python
def test_invalid_thread_memo():
    memo = '{"z":123}'  # Missing 't'
    data = parse_memo(memo)
    assert is_thread_message(data) == False
```

### 2. Integration Tests

1. Send transaction with thread memo
2. Verify pending message created
3. Verify OTP generated
4. Enter OTP and verify message promoted
5. Check message appears in `/api/thread/messages`

### 3. End-to-End Testing

1. Navigate to `/thread-app`
2. Log in with test account
3. Compose message
4. Scan QR with wallet
5. Send 0 ZEC transaction
6. Verify message appears in feed

## Common Issues

### OTP not being generated
- Check memo is correctly identified as thread format
- Verify `request_id` is being stored
- Check OTP generation is called

### Message not appearing
- Verify pending message was created
- Verify OTP was accepted
- Check RPC function `confirm_thread_otp_sql` is being called
- Verify message visibility (`is_visible = true`)

### Polling not detecting memo
- Check memo format is exactly: `{"z":ZID,"t":"text"}`
- Verify memo is base64 encoded in transaction
- Check `zcasher_id` matches request user

## Performance Considerations

1. **Memo parsing:** Should be fast (JSON parse only)
2. **Message storage:** Use index on `request_id` for quick lookup
3. **OTP lookup:** Index on `request_id` and `expires_at` for cleanup

## Security Notes

1. **Validate message size** - Check `len(message.encode('utf-8')) <= 512`
2. **Sanitize before storage** - Already handled by JSON parsing
3. **Rate limit OTP attempts** - Reuse existing rate limiting
4. **Clean up expired messages** - Run periodic cleanup job

## Rollback Plan

If issues occur:
1. Disable thread-app route (remove navigation link)
2. Stop OTP generation for thread messages
3. Messages already posted remain visible
4. Pending messages expire after 1 hour
5. No data loss (messages in `thread_messages` are final)

## Support and Questions

Refer to:
- Frontend code: `/lib/thread/` directory
- Database schema: `lib/thread/schema.sql`
- API usage: `THREAD_BACKEND_INTEGRATION.md` (this file)
- Implementation reference: `/app/thread-app/` components
