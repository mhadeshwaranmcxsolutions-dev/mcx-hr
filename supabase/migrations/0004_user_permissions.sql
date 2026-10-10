-- 0004: Add user-level permission overrides

ALTER TABLE permissions ADD COLUMN IF NOT EXISTS user_id UUID;

-- Drop old unique constraint and add new one that includes user_id
ALTER TABLE permissions DROP CONSTRAINT IF EXISTS permissions_role_page_key;
ALTER TABLE permissions ADD CONSTRAINT permissions_role_page_user_key UNIQUE (role, page, user_id);
