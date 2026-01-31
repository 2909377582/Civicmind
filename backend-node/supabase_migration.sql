-- Add scoring_points column to standard_answers table
-- This enables storing structured scoring criteria for AI grading
ALTER TABLE standard_answers 
ADD COLUMN IF NOT EXISTS scoring_points JSONB DEFAULT '[]'::jsonb;

-- Optional: Add comment
COMMENT ON COLUMN standard_answers.scoring_points IS 'Structured scoring points with score and keywords';
