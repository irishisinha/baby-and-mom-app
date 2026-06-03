-- Add appointee_for column to appointments table
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS appointee_for VARCHAR(50);
