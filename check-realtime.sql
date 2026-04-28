-- Check if realtime is enabled for events table
-- Run this in Supabase SQL Editor with postgres role

SELECT 
  schemaname,
  tablename,
  pubname
FROM pg_publication_tables
WHERE tablename = 'events';
