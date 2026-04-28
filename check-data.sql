-- Check if there's any data in the database
-- Run this in Supabase SQL Editor with postgres role

-- Check events
SELECT COUNT(*) as event_count FROM public.events;

-- Check forex cache
SELECT COUNT(*) as forex_count FROM public.forex_cache;

-- Check env data cache
SELECT COUNT(*) as env_count FROM public.env_data_cache;

-- If events exist, show them
SELECT id, headline, country, impact_level, published_at 
FROM public.events 
ORDER BY published_at DESC 
LIMIT 5;
