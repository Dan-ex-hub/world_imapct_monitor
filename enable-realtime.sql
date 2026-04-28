-- Enable Realtime for events table
-- Run this in Supabase SQL Editor with postgres role

-- Add events table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;

-- Verify it worked
SELECT 
  schemaname,
  tablename,
  pubname
FROM pg_publication_tables
WHERE tablename = 'events';
