-- Vessels
CREATE TABLE IF NOT EXISTS vessels (
  vessel_id     TEXT PRIMARY KEY,
  owner_address TEXT NOT NULL,
  fisher_address TEXT NOT NULL,
  name          TEXT NOT NULL,
  flag_state    TEXT NOT NULL,
  imo_number    TEXT NOT NULL UNIQUE,
  status        TEXT NOT NULL DEFAULT 'active',
  compliance_score INTEGER NOT NULL DEFAULT 100,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Catch events
CREATE TABLE IF NOT EXISTS catch_events (
  catch_id      TEXT PRIMARY KEY,
  vessel_id     TEXT NOT NULL REFERENCES vessels(vessel_id),
  fisher_address TEXT NOT NULL,
  species       TEXT NOT NULL,
  weight_kg     NUMERIC NOT NULL,
  latitude      NUMERIC NOT NULL,
  longitude     NUMERIC NOT NULL,
  ipfs_evidence TEXT,
  status        TEXT NOT NULL DEFAULT 'pending',
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at   TIMESTAMPTZ,
  verifier_address TEXT,
  fraud_flags   JSONB DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS idx_catch_vessel ON catch_events(vessel_id);
CREATE INDEX IF NOT EXISTS idx_catch_fisher ON catch_events(fisher_address);
CREATE INDEX IF NOT EXISTS idx_catch_status ON catch_events(status);

-- Telemetry pings
CREATE TABLE IF NOT EXISTS telemetry (
  id            BIGSERIAL PRIMARY KEY,
  vessel_id     TEXT NOT NULL,
  latitude      NUMERIC NOT NULL,
  longitude     NUMERIC NOT NULL,
  speed_knots   NUMERIC,
  heading_deg   NUMERIC,
  recorded_at   TIMESTAMPTZ NOT NULL,
  received_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source        TEXT NOT NULL DEFAULT 'gps' -- gps | sms | manual
);
CREATE INDEX IF NOT EXISTS idx_telemetry_vessel ON telemetry(vessel_id, recorded_at DESC);

-- Blue credits
CREATE TABLE IF NOT EXISTS blue_credits (
  credit_id     TEXT PRIMARY KEY,
  vessel_id     TEXT NOT NULL,
  fisher_address TEXT NOT NULL,
  catch_id      TEXT NOT NULL REFERENCES catch_events(catch_id),
  amount        BIGINT NOT NULL,
  sustainability_score INTEGER NOT NULL,
  issued_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  retired       BOOLEAN NOT NULL DEFAULT FALSE,
  stellar_tx_hash TEXT
);

-- Payouts
CREATE TABLE IF NOT EXISTS payouts (
  payout_id     TEXT PRIMARY KEY,
  fisher_address TEXT NOT NULL,
  amount        BIGINT NOT NULL,
  catch_id      TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',
  stellar_tx_hash TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  executed_at   TIMESTAMPTZ
);

-- ESG snapshots
CREATE TABLE IF NOT EXISTS esg_snapshots (
  period_start  BIGINT PRIMARY KEY,
  period_end    BIGINT NOT NULL,
  total_verified_kg BIGINT NOT NULL,
  total_credits_issued BIGINT NOT NULL,
  active_vessels INTEGER NOT NULL,
  avg_sustainability_score INTEGER NOT NULL,
  merkle_root   TEXT NOT NULL,
  stellar_tx_hash TEXT,
  published_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SMS sessions (for USSD/SMS offline reporting)
CREATE TABLE IF NOT EXISTS sms_sessions (
  session_id    TEXT PRIMARY KEY,
  phone_number  TEXT NOT NULL,
  fisher_address TEXT,
  state         TEXT NOT NULL DEFAULT 'init',
  data          JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
