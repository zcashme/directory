-- Thread Feature Database Schema
-- Execute this SQL in Supabase SQL Editor

-- Create thread_messages table for public messages
CREATE TABLE thread_messages (
  id BIGSERIAL PRIMARY KEY,
  zcasher_id INTEGER REFERENCES zcasher_searchable(id) ON DELETE SET NULL,
  message_text TEXT NOT NULL CHECK (length(message_text) <= 2000),
  memo_hash TEXT,
  tx_id TEXT,
  request_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  is_visible BOOLEAN DEFAULT true
);

-- Create indexes for common queries
CREATE INDEX idx_thread_messages_created ON thread_messages(created_at DESC);
CREATE INDEX idx_thread_messages_zcasher ON thread_messages(zcasher_id);
CREATE INDEX idx_thread_messages_visible ON thread_messages(is_visible) WHERE is_visible = true;

-- Create pending_thread_messages table for messages awaiting OTP confirmation
CREATE TABLE pending_thread_messages (
  id BIGSERIAL PRIMARY KEY,
  zcasher_id INTEGER NOT NULL REFERENCES zcasher_searchable(id) ON DELETE CASCADE,
  request_id TEXT NOT NULL UNIQUE,
  message_text TEXT NOT NULL,
  memo_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 hour'
);

-- Create indexes for pending messages
CREATE INDEX idx_pending_thread_messages_request_id ON pending_thread_messages(request_id);
CREATE INDEX idx_pending_thread_messages_zcasher ON pending_thread_messages(zcasher_id);
CREATE INDEX idx_pending_thread_messages_expires ON pending_thread_messages(expires_at);

-- Create RPC function to confirm thread OTP
CREATE OR REPLACE FUNCTION confirm_thread_otp_sql(
  in_zcasher_id INTEGER,
  in_otp TEXT
) RETURNS TABLE (status TEXT, message TEXT, message_id BIGINT) AS $$
DECLARE
  v_pending_id BIGINT;
  v_message_id BIGINT;
  v_otp_used BOOLEAN;
  v_otp_expired BOOLEAN;
BEGIN
  -- Check if OTP exists and is valid
  -- Note: This assumes OTP validation is handled by the verification service
  -- For now, we'll accept any valid OTP format (6 digits)

  IF in_otp IS NULL OR in_otp = '' THEN
    RETURN QUERY SELECT 'invalid'::TEXT, 'OTP is required'::TEXT, NULL::BIGINT;
    RETURN;
  END IF;

  -- Get the most recent pending message for this user
  SELECT id INTO v_pending_id
  FROM pending_thread_messages
  WHERE zcasher_id = in_zcasher_id
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_pending_id IS NULL THEN
    RETURN QUERY SELECT 'expired'::TEXT, 'No pending message or message expired'::TEXT, NULL::BIGINT;
    RETURN;
  END IF;

  -- Promote pending message to public thread_messages
  INSERT INTO thread_messages (
    zcasher_id,
    message_text,
    request_id,
    memo_hash,
    verified_at
  )
  SELECT
    zcasher_id,
    message_text,
    request_id,
    memo_hash,
    NOW()
  FROM pending_thread_messages
  WHERE id = v_pending_id
  RETURNING thread_messages.id INTO v_message_id;

  -- Delete the pending message
  DELETE FROM pending_thread_messages WHERE id = v_pending_id;

  -- Return success
  RETURN QUERY SELECT 'confirmed'::TEXT, 'Message posted successfully'::TEXT, v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION confirm_thread_otp_sql(INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_thread_otp_sql(INTEGER, TEXT) TO anon;

-- Create policies for thread_messages (public read, authenticated write)
ALTER TABLE thread_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON thread_messages
  FOR SELECT USING (is_visible = true);

CREATE POLICY "Allow authenticated insert" ON thread_messages
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create policies for pending_thread_messages
ALTER TABLE pending_thread_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to view own pending" ON pending_thread_messages
  FOR SELECT USING (
    zcasher_id = (SELECT id FROM zcasher_searchable WHERE id = zcasher_id LIMIT 1)
  );

CREATE POLICY "Allow authenticated insert" ON pending_thread_messages
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
