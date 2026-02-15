-- ============================================================
-- D1 Migration: 0002_cf_zone_dns.sql
-- Add Cloudflare Zone/DNS support to domains and CF accounts
-- ============================================================

-- Add API Token and Account ID to CF accounts for multi-account support
ALTER TABLE cf_accounts ADD COLUMN account_id TEXT DEFAULT '';
ALTER TABLE cf_accounts ADD COLUMN api_token TEXT DEFAULT '';

-- Add zone tracking fields to domains
ALTER TABLE ops_domains ADD COLUMN zone_id TEXT DEFAULT '';
ALTER TABLE ops_domains ADD COLUMN nameservers TEXT DEFAULT '[]';
ALTER TABLE ops_domains ADD COLUMN cf_status TEXT DEFAULT '';
