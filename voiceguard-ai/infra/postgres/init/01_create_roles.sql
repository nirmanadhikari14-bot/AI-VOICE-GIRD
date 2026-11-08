-- =============================================================================
-- VoiceGuard AI — Production Database Initialization & Role Isolation
-- Phase 32: Production Infrastructure (SIH26104)
-- =============================================================================

-- Ensure database runs in read-committed transaction isolation
ALTER DATABASE voiceguard SET default_transaction_isolation TO 'read committed';

-- Revoke public permissions on default schema
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO voiceguard;

-- Set up read-only analytical reporting role (least privilege)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'voiceguard_readonly') THEN
        CREATE ROLE voiceguard_readonly WITH LOGIN PASSWORD 'CHANGE_ME_READONLY_SECRET';
    END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO voiceguard_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO voiceguard_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO voiceguard_readonly;

-- Enforce connection limits
ALTER ROLE voiceguard_readonly CONNECTION LIMIT 10;

