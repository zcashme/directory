# Verification Sessions Schema

## Table: verification_sessions

Stores pending verification sessions for profile edits. One session per profile, with brute-force protection.

```sql
CREATE TABLE verification_sessions (
  id SERIAL PRIMARY KEY,
  zcasher_id INTEGER NOT NULL UNIQUE REFERENCES zcasher(id) ON DELETE CASCADE,
  session_id TEXT UNIQUE NOT NULL,
  memo TEXT NOT NULL,
  pending_edits JSONB DEFAULT '{}',
  attempts_remaining INTEGER DEFAULT 3,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fast lookups by profile
CREATE INDEX idx_verification_sessions_zcasher
  ON verification_sessions(zcasher_id);

-- Cleanup expired sessions
CREATE INDEX idx_verification_sessions_expires
  ON verification_sessions(expires_at);
```

### Columns

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary key |
| `zcasher_id` | INTEGER | FK to zcasher, UNIQUE (one session per profile) |
| `session_id` | TEXT | Random 16-digit ID for OTP derivation |
| `memo` | TEXT | Full memo: `zvs/{session_id},{u-address}` |
| `pending_edits` | JSONB | Edits to apply on successful verification |
| `attempts_remaining` | INTEGER | Starts at 3, decrements on wrong OTP |
| `expires_at` | TIMESTAMPTZ | 24h from creation |
| `created_at` | TIMESTAMPTZ | When session was created |

### Security Rules

1. **One session per profile** - UNIQUE constraint on `zcasher_id`
2. **3 attempts max** - `attempts_remaining` decrements on failure
3. **Lockout on exhaustion** - Can't create new session while locked (attempts=0) until expiry
4. **24h expiry** - Sessions auto-expire, allowing retry

---

## RPC: apply_pending_edits_sql

Applies pending edits to a profile after successful OTP verification.

```sql
CREATE OR REPLACE FUNCTION apply_pending_edits_sql(
  in_zcasher_id INTEGER,
  in_session_id TEXT,
  in_pending_edits JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Verify session exists and matches
  IF NOT EXISTS (
    SELECT 1 FROM verification_sessions
    WHERE zcasher_id = in_zcasher_id
      AND session_id = in_session_id
      AND expires_at > NOW()
  ) THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Session not found or expired');
  END IF;

  -- Mark address as verified
  UPDATE zcasher
  SET address_verified = true,
      last_verified_at = NOW()
  WHERE id = in_zcasher_id;

  -- Apply pending edits if any
  IF in_pending_edits IS NOT NULL AND in_pending_edits != '{}'::jsonb THEN
    -- Update name if provided
    IF in_pending_edits ? 'name' THEN
      UPDATE zcasher SET name = in_pending_edits->>'name' WHERE id = in_zcasher_id;
    END IF;

    -- Update display_name if provided
    IF in_pending_edits ? 'display_name' THEN
      UPDATE zcasher SET display_name = in_pending_edits->>'display_name' WHERE id = in_zcasher_id;
    END IF;

    -- Update bio if provided
    IF in_pending_edits ? 'bio' THEN
      UPDATE zcasher SET bio = in_pending_edits->>'bio' WHERE id = in_zcasher_id;
    END IF;

    -- Update profile_image_url if provided
    IF in_pending_edits ? 'profile_image_url' THEN
      UPDATE zcasher SET profile_image_url = in_pending_edits->>'profile_image_url' WHERE id = in_zcasher_id;
    END IF;

    -- Update address if provided (requires re-verification next time)
    IF in_pending_edits ? 'address' THEN
      UPDATE zcasher
      SET address = in_pending_edits->>'address',
          address_verified = false  -- New address needs verification
      WHERE id = in_zcasher_id;
    END IF;

    -- Update nearest_city_id if provided
    IF in_pending_edits ? 'nearest_city_id' THEN
      UPDATE zcasher
      SET nearest_city_id = (in_pending_edits->>'nearest_city_id')::INTEGER
      WHERE id = in_zcasher_id;
    END IF;

    -- Handle link updates if provided
    -- Format: { "links": [{ "id": 1, "url": "..." }, { "id": null, "url": "..." }] }
    -- id=null means new link, id=-X means delete link X
    IF in_pending_edits ? 'links' THEN
      -- Delete links marked for deletion (negative IDs)
      DELETE FROM zcasher_links
      WHERE zcasher_id = in_zcasher_id
        AND id IN (
          SELECT ABS((link->>'id')::INTEGER)
          FROM jsonb_array_elements(in_pending_edits->'links') AS link
          WHERE (link->>'id')::INTEGER < 0
        );

      -- Update existing links
      UPDATE zcasher_links zl
      SET url = link->>'url',
          updated_at = NOW()
      FROM jsonb_array_elements(in_pending_edits->'links') AS link
      WHERE zl.zcasher_id = in_zcasher_id
        AND zl.id = (link->>'id')::INTEGER
        AND (link->>'id')::INTEGER > 0;

      -- Insert new links (id = null)
      INSERT INTO zcasher_links (zcasher_id, url, created_at)
      SELECT in_zcasher_id, link->>'url', NOW()
      FROM jsonb_array_elements(in_pending_edits->'links') AS link
      WHERE link->>'id' IS NULL
        AND link->>'url' IS NOT NULL
        AND (link->>'url') != '';
    END IF;
  END IF;

  result := jsonb_build_object(
    'status', 'verified',
    'zcasher_id', in_zcasher_id
  );

  RETURN result;
END;
$$;
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `in_zcasher_id` | INTEGER | Profile ID to update |
| `in_session_id` | TEXT | Session ID for verification |
| `in_pending_edits` | JSONB | Edits to apply |

### pending_edits Format

```json
{
  "name": "newusername",
  "display_name": "New Display Name",
  "bio": "Updated bio",
  "profile_image_url": "https://...",
  "address": "u1newaddress...",
  "nearest_city_id": 123,
  "links": [
    { "id": 1, "url": "https://updated.com" },
    { "id": null, "url": "https://newlink.com" },
    { "id": -2, "url": "" }
  ]
}
```

- `id: positive` = update existing link
- `id: null` = create new link
- `id: negative` = delete link (absolute value is the link ID)

---

## Cleanup Job (Optional)

Run periodically to remove expired sessions:

```sql
DELETE FROM verification_sessions WHERE expires_at < NOW();
```
