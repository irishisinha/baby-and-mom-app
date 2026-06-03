-- Create family_device_tokens table for storing FCM tokens
CREATE TABLE IF NOT EXISTS family_device_tokens (
  id BIGSERIAL PRIMARY KEY,
  phone_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  fcm_token TEXT NOT NULL,
  registered_at TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_family_device_tokens_phone ON family_device_tokens(phone_number);

-- Enable RLS
ALTER TABLE family_device_tokens ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public read" ON family_device_tokens FOR SELECT USING (true);
