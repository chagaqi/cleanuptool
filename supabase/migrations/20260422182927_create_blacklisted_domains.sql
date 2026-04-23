/*
  # Email Domain Blacklist

  1. New Tables
    - `blacklisted_domains`
      - `domain` (text, primary key) - lowercase bare domain
      - `source` (text) - how the domain was added: 'seed', 'llm', 'manual'
      - `status` (text) - 'active' (used for filtering) or 'reverted' (kept as history, ignored)
      - `reasoning` (text) - short justification when added by the LLM scan
      - `created_at` (timestamptz)

  2. Security
    - RLS enabled
    - Anon role may SELECT active rows (app is a single-tenant local tool; no user auth)
    - Anon role may INSERT new rows
    - Anon role may UPDATE status (for revert / re-confirm)
    - No DELETE policy - history is preserved

  3. Notes
    - Single-tenant utility app with no auth model. Policies intentionally allow
      anon read/write since the only client is this app.
    - Seed inserts the current hardcoded blacklist on first run. ON CONFLICT
      keeps re-runs idempotent.
*/

CREATE TABLE IF NOT EXISTS blacklisted_domains (
  domain text PRIMARY KEY,
  source text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'active',
  reasoning text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE blacklisted_domains ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'blacklisted_domains' AND policyname = 'Anyone can read blacklist'
  ) THEN
    CREATE POLICY "Anyone can read blacklist"
      ON blacklisted_domains FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'blacklisted_domains' AND policyname = 'Anyone can insert blacklist'
  ) THEN
    CREATE POLICY "Anyone can insert blacklist"
      ON blacklisted_domains FOR INSERT
      TO anon, authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'blacklisted_domains' AND policyname = 'Anyone can update blacklist'
  ) THEN
    CREATE POLICY "Anyone can update blacklist"
      ON blacklisted_domains FOR UPDATE
      TO anon, authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

INSERT INTO blacklisted_domains (domain, source, status, reasoning)
VALUES
  ('godaddy.com', 'seed', 'active', 'Domain registrar - not a business contact email.'),
  ('wixpress.com', 'seed', 'active', 'Website builder default address.'),
  ('domainsbyproxy.com', 'seed', 'active', 'WHOIS privacy proxy.')
ON CONFLICT (domain) DO NOTHING;