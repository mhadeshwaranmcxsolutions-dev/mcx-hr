-- 0003: Permissions table for role-based page access

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('admin', 'hr', 'manager', 'employee')),
  page TEXT NOT NULL,
  can_access BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(role, page)
);

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow authenticated" ON permissions FOR ALL TO authenticated USING (true) WITH CHECK (true);
