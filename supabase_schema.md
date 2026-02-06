# Supabase Database Schema

> **WARNING**: This schema is for context only and is not meant to be run.
> Table order and constraints may not be valid for execution.

```sql
CREATE TABLE public.admin_refund_progress (
  txid text NOT NULL,
  completed boolean DEFAULT false,
  completed_at timestamp with time zone,
  CONSTRAINT admin_refund_progress_pkey PRIMARY KEY (txid)
);

CREATE TABLE public.auth_challenges (
  id bigint NOT NULL DEFAULT nextval('zcasher_auth_id_seq'::regclass),
  zcasher_id bigint,
  address text NOT NULL,
  nonce text NOT NULL,
  signin_challenge_code text,
  signin_challenge_txid text,
  signin_requested_at timestamp with time zone DEFAULT now(),
  signin_verified_at timestamp with time zone,
  status text DEFAULT 'created'::text,
  notes jsonb,
  user_id uuid,
  CONSTRAINT auth_challenges_pkey PRIMARY KEY (id),
  CONSTRAINT auth_challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT zcasher_auth_zcasher_id_fkey FOREIGN KEY (zcasher_id) REFERENCES public.zcasher(id)
);

CREATE TABLE public.bot_posted_tweets (
  id integer NOT NULL DEFAULT nextval('bot_posted_tweets_id_seq'::regclass),
  tweet_id text,
  posted_at timestamp with time zone DEFAULT now(),
  posted_type text,
  included_zcasher_ids ARRAY,
  tweet_text text,
  CONSTRAINT bot_posted_tweets_pkey PRIMARY KEY (id)
);

CREATE TABLE public.devtool_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  zcasher_id bigint,
  action text,
  status text,
  message text,
  meta jsonb,
  ts timestamp with time zone DEFAULT now(),
  CONSTRAINT devtool_logs_pkey PRIMARY KEY (id)
);

CREATE TABLE public.donation_hidden (
  donation_id text NOT NULL,
  hidden boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT donation_hidden_pkey PRIMARY KEY (donation_id)
);

CREATE TABLE public.pending_zcasher_edits (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  zcasher_id bigint NOT NULL,
  raw_memo text NOT NULL,
  profile jsonb DEFAULT '{}'::jsonb,
  links jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  processed boolean DEFAULT false,
  CONSTRAINT pending_zcasher_edits_pkey PRIMARY KEY (id),
  CONSTRAINT pending_zcasher_edits_zcasher_id_fkey FOREIGN KEY (zcasher_id) REFERENCES public.zcasher(id)
);

CREATE TABLE public.refund_progress (
  txid text NOT NULL,
  processed boolean DEFAULT false,
  processed_at timestamp with time zone,
  notes text,
  CONSTRAINT refund_progress_pkey PRIMARY KEY (txid)
);

CREATE TABLE public.staging_transactions (
  txid text,
  mined_height bigint,
  mined_time timestamp with time zone,
  amount text,
  fee text,
  note_summary text,
  output_index integer,
  output_pool text,
  output_value text,
  output_account text,
  output_to text,
  output_memo text,
  outgoing_message text,
  refund_amount numeric
);

CREATE TABLE public.transaction_ingest_log (
  id bigint NOT NULL DEFAULT nextval('transaction_ingest_log_id_seq'::regclass),
  txid text NOT NULL,
  source text NOT NULL CHECK (source = ANY (ARRAY['rpc'::text, 'devtool'::text])),
  memo_raw text,
  memo_norm text,
  raw_payload jsonb,
  ingested_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT transaction_ingest_log_pkey PRIMARY KEY (id)
);

CREATE TABLE public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  zcasher_id bigint,
  txid text UNIQUE,
  memo text,
  ts timestamp with time zone DEFAULT now(),
  zid text,
  raw text,
  tx_time timestamp with time zone,
  tx_ignore boolean,
  CONSTRAINT transactions_pkey PRIMARY KEY (id),
  CONSTRAINT transactions_zcasher_id_fkey FOREIGN KEY (zcasher_id) REFERENCES public.zcasher(id)
);

CREATE TABLE public.verification_codes (
  zcasher_id bigint NOT NULL,
  code_hash text,
  expires_at timestamp with time zone,
  attempts_left integer DEFAULT 3,
  created_at timestamp with time zone DEFAULT now(),
  id uuid DEFAULT gen_random_uuid(),
  zid text,
  otp text,
  is_verified boolean DEFAULT false,
  otp_send_success boolean,
  otp_send_txid text,
  verification_elapsed_seconds integer,
  CONSTRAINT verification_codes_pkey PRIMARY KEY (zcasher_id),
  CONSTRAINT verification_codes_zcasher_id_fkey FOREIGN KEY (zcasher_id) REFERENCES public.zcasher(id)
);

CREATE TABLE public.verification_poll_requests (
  id text NOT NULL,
  zid integer NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  started_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL,
  matched_txid text,
  matched_memo text,
  matched_at timestamp with time zone,
  otp_status text,
  elapsed_seconds integer,
  otp_phase text,
  otp_phase_history jsonb,
  seen_txids jsonb NOT NULL DEFAULT '[]'::jsonb,
  CONSTRAINT verification_poll_requests_pkey PRIMARY KEY (id)
);

CREATE TABLE public.worldcities (
  city text,
  city_ascii text,
  lat double precision,
  lng double precision,
  country text,
  iso2 text,
  iso3 text,
  admin_name text,
  capital text,
  population bigint,
  id bigint UNIQUE
);

CREATE TABLE public.zcasher (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  address text NOT NULL UNIQUE,
  name text NOT NULL,
  bio text,
  claim_code text,
  claimed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  last_signed_at timestamp with time zone,
  signin_challenge_code text,
  signin_challenge_txid text,
  ephemeral_expires_at timestamp with time zone,
  status_computed text DEFAULT
CASE
    WHEN (claimed_at IS NULL) THEN 'unclaimed'::text
    ELSE 'claimed'::text
END,
  slug text UNIQUE,
  referred_by text,
  address_verified boolean DEFAULT false,
  featured boolean DEFAULT false,
  profile_image_url text,
  last_verified_at timestamp with time zone,
  verification_expires_at timestamp with time zone,
  referred_by_zcasher_id bigint,
  verif_expires_at timestamp with time zone,
  category text,
  nearest_city_id bigint,
  nearest_city_name text,
  is_ns boolean DEFAULT false,
  is_ns_longterm boolean DEFAULT false,
  ns_version integer,
  is_ns_core boolean DEFAULT false,
  display_name text,
  iso2 text,
  country text,
  CONSTRAINT zcasher_pkey PRIMARY KEY (id),
  CONSTRAINT zcasher_nearest_city_fk FOREIGN KEY (nearest_city_id) REFERENCES public.worldcities(id)
);

CREATE TABLE public.zcasher_items (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  zcasher_id bigint NOT NULL,
  kind text CHECK (kind = ANY (ARRAY['link'::text, 'address'::text])),
  value text NOT NULL,
  label text,
  is_verified boolean DEFAULT false,
  last_verified_at timestamp with time zone,
  verification_expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT zcasher_items_pkey PRIMARY KEY (id),
  CONSTRAINT zcasher_items_zcasher_id_fkey FOREIGN KEY (zcasher_id) REFERENCES public.zcasher(id)
);

CREATE TABLE public.zcasher_links (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  zcasher_id bigint NOT NULL,
  label text NOT NULL,
  url text NOT NULL,
  order_index integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_verified boolean DEFAULT false,
  pending_verif boolean NOT NULL DEFAULT false,
  CONSTRAINT zcasher_links_pkey PRIMARY KEY (id),
  CONSTRAINT zcasher_links_zcasher_id_fkey FOREIGN KEY (zcasher_id) REFERENCES public.zcasher(id)
);

CREATE TABLE public.zcasher_map_data (
  zcasher_id bigint NOT NULL,
  city text,
  country text,
  lat double precision,
  lon double precision,
  CONSTRAINT zcasher_map_data_pkey PRIMARY KEY (zcasher_id),
  CONSTRAINT zcasher_map_data_zcasher_id_fkey FOREIGN KEY (zcasher_id) REFERENCES public.zcasher(id)
);

CREATE TABLE public.zcasher_name_map (
  name text,
  canonical_id bigint,
  dup_count bigint
);

CREATE TABLE public.zcasher_verifications (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  zcasher_id bigint NOT NULL,
  link_id bigint,
  verified boolean NOT NULL DEFAULT false,
  method text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  verified_at timestamp with time zone DEFAULT now(),
  CONSTRAINT zcasher_verifications_pkey PRIMARY KEY (id),
  CONSTRAINT zcasher_verifications_link_id_fkey FOREIGN KEY (link_id) REFERENCES public.zcasher_links(id),
  CONSTRAINT zcasher_verifications_zcasher_id_fkey FOREIGN KEY (zcasher_id) REFERENCES public.zcasher(id)
);

CREATE TABLE public.zm_ns_staging (
  zcash.me text,
  discord_display_name text,
  discord name text,
  discord bio text,
  linkedin text,
  twitter text,
  zcasher_id bigint
);
```
