CREATE SEQUENCE IF NOT EXISTS app.agent_code_seq START 1;
ALTER TABLE app.agents ADD COLUMN IF NOT EXISTS display_code text UNIQUE;
-- backfill existing agents
WITH numbered AS (SELECT id, row_number() OVER (ORDER BY created_at) as rn FROM app.agents WHERE display_code IS NULL)
UPDATE app.agents SET display_code = 'CC' || numbered.rn FROM numbered WHERE agents.id = numbered.id;
-- ensure sequence continues past max
SELECT setval('app.agent_code_seq', COALESCE((SELECT MAX(CAST(substring(display_code FROM 3) AS int)) FROM app.agents WHERE display_code ~ '^CC[0-9]+$'), 0));
ALTER TABLE app.agents ALTER COLUMN display_code SET DEFAULT ('CC' || nextval('app.agent_code_seq')::text);
