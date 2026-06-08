-- Add person_type column to baby_metrics table
ALTER TABLE baby_metrics 
ADD COLUMN person_type VARCHAR(50) DEFAULT 'baby';

-- Create index for faster filtering
CREATE INDEX idx_baby_metrics_person_type ON baby_metrics(person_type);

-- Update existing records to have person_type = 'baby'
UPDATE baby_metrics SET person_type = 'baby' WHERE person_type IS NULL;
