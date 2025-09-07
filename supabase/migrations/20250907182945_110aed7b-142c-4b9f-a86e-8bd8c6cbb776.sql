-- Add leads data column to search_history table to store actual lead results for premium searches
ALTER TABLE search_history 
ADD COLUMN leads jsonb DEFAULT null;

-- Add is_premium column to track whether this was a paid search
ALTER TABLE search_history 
ADD COLUMN is_premium boolean DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN search_history.leads IS 'Stores the actual lead data for premium searches that users paid for';
COMMENT ON COLUMN search_history.is_premium IS 'Indicates whether this was a premium/paid search with full results';