-- Upwork Automation Suite — Database Schema
-- Version: 1.2 (corrected — see PRD.md Change Log)
-- Run in Supabase SQL editor against the upwork-suite project

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE gig_status AS ENUM (
  'discovered',
  'triaged',
  'proposal_ready',
  'submitted',
  'viewed',
  'shortlisted',
  'interviewing',
  'contract_offered',
  'active',
  'completed',
  'archived'
);

CREATE TYPE priority_level AS ENUM ('high', 'medium', 'low');
CREATE TYPE budget_type AS ENUM ('fixed', 'hourly');
CREATE TYPE proposal_outcome AS ENUM ('pending', 'shortlisted', 'rejected', 'hired');

-- ============================================================
-- TABLE: upwork_gigs
-- ============================================================

CREATE TABLE upwork_gigs (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upwork_job_id           VARCHAR NOT NULL,
  url                     TEXT NOT NULL UNIQUE,         -- UNIQUE: deduplication guard
  title                   TEXT NOT NULL,
  client_id               VARCHAR,
  client_name             TEXT,
  client_payment_verified BOOLEAN NOT NULL DEFAULT false,
  client_rating           DECIMAL(3,2),                -- e.g. 4.93
  client_spent            VARCHAR,                     -- raw string from Upwork, e.g. "$10K+"
  budget_type             budget_type,
  budget_min              DECIMAL(10,2),
  budget_max              DECIMAL(10,2),
  posted_at               TIMESTAMPTZ,
  expires_at              TIMESTAMPTZ,
  description             TEXT,
  skills_required         JSONB DEFAULT '[]',          -- array of skill tag strings
  proposals_count         INTEGER DEFAULT 0,
  score                   INTEGER CHECK (score >= 0 AND score <= 100),
  priority                priority_level,
  status                  gig_status NOT NULL DEFAULT 'discovered',
  notes                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: upwork_proposals
-- ============================================================

CREATE TABLE upwork_proposals (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id                UUID NOT NULL REFERENCES upwork_gigs(id) ON DELETE CASCADE,
  proposal_text         TEXT NOT NULL,
  bid_amount            DECIMAL(10,2),
  bid_type              budget_type,
  connects_spent        INTEGER DEFAULT 6,             -- standard 6; more for Boosted
  screening_answers     JSONB DEFAULT '[]',            -- array of {question, answer} objects
  submitted_at          TIMESTAMPTZ,                   -- set manually by Yogesh after submission
  viewed_at             TIMESTAMPTZ,
  response_received_at  TIMESTAMPTZ,
  outcome               proposal_outcome NOT NULL DEFAULT 'pending',
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: upwork_contracts
-- ============================================================

CREATE TABLE upwork_contracts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id           UUID NOT NULL REFERENCES upwork_gigs(id) ON DELETE RESTRICT,
  proposal_id      UUID REFERENCES upwork_proposals(id) ON DELETE RESTRICT,
  client_name      TEXT NOT NULL,
  contract_type    budget_type NOT NULL,
  rate             DECIMAL(10,2) NOT NULL,
  total_value      DECIMAL(10,2),                      -- nullable at start, set at close
  started_at       TIMESTAMPTZ NOT NULL,
  completed_at     TIMESTAMPTZ,                        -- nullable until contract closes
  review_received  BOOLEAN DEFAULT false,
  review_score     DECIMAL(3,2),
  earnings         DECIMAL(10,2),                      -- net after Upwork fees
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_gigs_status    ON upwork_gigs(status);
CREATE INDEX idx_gigs_priority  ON upwork_gigs(priority);
CREATE INDEX idx_gigs_posted_at ON upwork_gigs(posted_at DESC);
CREATE INDEX idx_gigs_score     ON upwork_gigs(score DESC);
CREATE INDEX idx_proposals_gig  ON upwork_proposals(gig_id);
CREATE INDEX idx_contracts_gig  ON upwork_contracts(gig_id);

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_gigs_updated_at
  BEFORE UPDATE ON upwork_gigs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_proposals_updated_at
  BEFORE UPDATE ON upwork_proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_contracts_updated_at
  BEFORE UPDATE ON upwork_contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE upwork_gigs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE upwork_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE upwork_contracts ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS automatically.
-- These policies allow the anon key read-only access if needed locally.
CREATE POLICY "service_role_all" ON upwork_gigs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all" ON upwork_proposals
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all" ON upwork_contracts
  FOR ALL TO service_role USING (true) WITH CHECK (true);
