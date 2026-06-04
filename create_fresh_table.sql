-- Drop the old appointments table
DROP TABLE IF EXISTS appointments;

-- Create fresh appointments table
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  doctor VARCHAR(255),
  reason TEXT,
  appointment_date DATE,
  appointment_time VARCHAR(100),
  appointee_for VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_appointments_date ON appointments(appointment_date DESC);
CREATE INDEX idx_appointments_user ON appointments(user_id);

-- Enable RLS (Row Level Security) if needed
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all access (since we're using service role)
CREATE POLICY "Allow all access" ON appointments FOR ALL USING (true);
