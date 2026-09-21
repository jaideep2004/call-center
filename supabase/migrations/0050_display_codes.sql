-- 0050 serialized human-readable display codes.
-- UUIDs stay the primary keys everywhere; display_code is display-only
-- (lists, support tickets, client-facing references). Format PREFIX-NNNN.
-- Prefixes: AC agencies, CA campaigns, CL calls, PB publishers, IN invoices,
-- AG agents (migrated from the legacy CC<n> format, numbers preserved).

CREATE SEQUENCE IF NOT EXISTS app.agency_code_seq START 1;
CREATE SEQUENCE IF NOT EXISTS app.campaign_code_seq START 1;
CREATE SEQUENCE IF NOT EXISTS app.call_code_seq START 1;
CREATE SEQUENCE IF NOT EXISTS app.publisher_code_seq START 1;
CREATE SEQUENCE IF NOT EXISTS app.invoice_code_seq START 1;

ALTER TABLE app.agencies ADD COLUMN IF NOT EXISTS display_code text UNIQUE;
ALTER TABLE app.campaigns ADD COLUMN IF NOT EXISTS display_code text UNIQUE;
ALTER TABLE app.calls ADD COLUMN IF NOT EXISTS display_code text UNIQUE;
ALTER TABLE app.publishers ADD COLUMN IF NOT EXISTS display_code text UNIQUE;
ALTER TABLE app.invoices ADD COLUMN IF NOT EXISTS display_code text UNIQUE;

-- backfill in creation order (idempotent: only NULL rows)
WITH numbered AS (SELECT id, row_number() OVER (ORDER BY created_at) as rn FROM app.agencies WHERE display_code IS NULL)
UPDATE app.agencies SET display_code = 'AC-' || LPAD(numbered.rn::text, 4, '0') FROM numbered WHERE agencies.id = numbered.id;

WITH numbered AS (SELECT id, row_number() OVER (ORDER BY created_at) as rn FROM app.campaigns WHERE display_code IS NULL)
UPDATE app.campaigns SET display_code = 'CA-' || LPAD(numbered.rn::text, 4, '0') FROM numbered WHERE campaigns.id = numbered.id;

WITH numbered AS (SELECT id, row_number() OVER (ORDER BY started_at NULLS LAST, id) as rn FROM app.calls WHERE display_code IS NULL)
UPDATE app.calls SET display_code = 'CL-' || LPAD(numbered.rn::text, 4, '0') FROM numbered WHERE calls.id = numbered.id;

WITH numbered AS (SELECT id, row_number() OVER (ORDER BY created_at) as rn FROM app.publishers WHERE display_code IS NULL)
UPDATE app.publishers SET display_code = 'PB-' || LPAD(numbered.rn::text, 4, '0') FROM numbered WHERE publishers.id = numbered.id;

WITH numbered AS (SELECT id, row_number() OVER (ORDER BY created_at) as rn FROM app.invoices WHERE display_code IS NULL)
UPDATE app.invoices SET display_code = 'IN-' || LPAD(numbered.rn::text, 4, '0') FROM numbered WHERE invoices.id = numbered.id;

-- sequences continue past the backfilled max (+1 with is_called=false so empty
-- tables start at 1 instead of failing setval with 0)
SELECT setval('app.agency_code_seq', COALESCE((SELECT MAX(CAST(substring(display_code FROM 4) AS int)) FROM app.agencies WHERE display_code ~ '^AC-[0-9]+$'), 0) + 1, false);
SELECT setval('app.campaign_code_seq', COALESCE((SELECT MAX(CAST(substring(display_code FROM 4) AS int)) FROM app.campaigns WHERE display_code ~ '^CA-[0-9]+$'), 0) + 1, false);
SELECT setval('app.call_code_seq', COALESCE((SELECT MAX(CAST(substring(display_code FROM 4) AS int)) FROM app.calls WHERE display_code ~ '^CL-[0-9]+$'), 0) + 1, false);
SELECT setval('app.publisher_code_seq', COALESCE((SELECT MAX(CAST(substring(display_code FROM 4) AS int)) FROM app.publishers WHERE display_code ~ '^PB-[0-9]+$'), 0) + 1, false);
SELECT setval('app.invoice_code_seq', COALESCE((SELECT MAX(CAST(substring(display_code FROM 4) AS int)) FROM app.invoices WHERE display_code ~ '^IN-[0-9]+$'), 0) + 1, false);

-- defaults for future inserts (column omitted => DB assigns; repos must not send NULL)
ALTER TABLE app.agencies ALTER COLUMN display_code SET DEFAULT ('AC-' || LPAD(nextval('app.agency_code_seq')::text, 4, '0'));
ALTER TABLE app.campaigns ALTER COLUMN display_code SET DEFAULT ('CA-' || LPAD(nextval('app.campaign_code_seq')::text, 4, '0'));
ALTER TABLE app.calls ALTER COLUMN display_code SET DEFAULT ('CL-' || LPAD(nextval('app.call_code_seq')::text, 4, '0'));
ALTER TABLE app.publishers ALTER COLUMN display_code SET DEFAULT ('PB-' || LPAD(nextval('app.publisher_code_seq')::text, 4, '0'));
ALTER TABLE app.invoices ALTER COLUMN display_code SET DEFAULT ('IN-' || LPAD(nextval('app.invoice_code_seq')::text, 4, '0'));

-- agents: unify legacy CC<n> to AG-NNNN, preserving each row's number
UPDATE app.agents SET display_code = 'AG-' || LPAD(substring(display_code FROM 3), 4, '0') WHERE display_code ~ '^CC[0-9]+$';
WITH numbered AS (SELECT id, row_number() OVER (ORDER BY id) as rn FROM app.agents WHERE display_code IS NULL)
UPDATE app.agents SET display_code = 'AG-' || LPAD(numbered.rn::text, 4, '0') FROM numbered WHERE agents.id = numbered.id;
SELECT setval('app.agent_code_seq', COALESCE((SELECT MAX(CAST(substring(display_code FROM 4) AS int)) FROM app.agents WHERE display_code ~ '^AG-[0-9]+$'), 0) + 1, false);
ALTER TABLE app.agents ALTER COLUMN display_code SET DEFAULT ('AG-' || LPAD(nextval('app.agent_code_seq')::text, 4, '0'));
