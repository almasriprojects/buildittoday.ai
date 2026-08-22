-- Add latitude/longitude columns to the leads table for the map view.
-- Run this in the Supabase SQL editor or via the Supabase CLI.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

-- Optional: index for faster queries filtering by coordinates presence
CREATE INDEX IF NOT EXISTS leads_coordinates_idx ON leads (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;