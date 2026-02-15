-- Registrar Accounts table for domain registration API credentials
-- Supports: Porkbun (apiKey + secretKey), Cloudflare Registrar (apiToken + accountId)
CREATE TABLE IF NOT EXISTS registrar_accounts (
  id TEXT PRIMARY KEY,
  provider TEXT DEFAULT '',
  label TEXT DEFAULT '',
  api_key TEXT DEFAULT '',
  secret_key TEXT DEFAULT '',
  account_id TEXT DEFAULT '',
  api_token TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Add registrar_account_id to ops_domains for linking domains to their registrar account
ALTER TABLE ops_domains ADD COLUMN registrar_account_id TEXT DEFAULT '';
