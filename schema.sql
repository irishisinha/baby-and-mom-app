-- Families
CREATE TABLE IF NOT EXISTS families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE families ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see their family" ON families
  FOR SELECT USING (id IN (
    SELECT family_id FROM family_members WHERE user_id = auth.uid()
  ));
