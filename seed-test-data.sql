-- Seed test data for ImpactGlobe
-- Run this in Supabase SQL Editor with postgres role

-- Insert test events (will appear as ripples on the globe)
INSERT INTO public.events (
  headline, 
  country, 
  lat, 
  lon, 
  impact_level, 
  category, 
  summary, 
  sentiment, 
  forex_impacts, 
  confidence_score, 
  is_market_moving, 
  published_at, 
  expires_at, 
  created_by
) VALUES 
  (
    'Federal Reserve Signals Rate Cuts in 2026',
    'United States',
    38.9072,
    -77.0369,
    'Critical',
    'Central Bank',
    'The Federal Reserve has indicated potential interest rate cuts in the coming months, citing cooling inflation and economic stabilization. Markets react positively to the dovish stance.',
    'Bullish USD short-term, bearish long-term',
    '[
      {"pair": "EUR/USD", "direction": -1, "magnitude": "Large", "movePercent": "-1.2%", "reasoning": "Dollar strengthens on rate cut expectations"},
      {"pair": "USD/JPY", "direction": 1, "magnitude": "Medium", "movePercent": "+0.8%", "reasoning": "Yen weakens against dollar"},
      {"pair": "GBP/USD", "direction": -1, "magnitude": "Small", "movePercent": "-0.4%", "reasoning": "Pound slightly weaker"}
    ]'::jsonb,
    92,
    true,
    NOW() - INTERVAL '2 hours',
    NOW() + INTERVAL '46 hours',
    'manual'
  ),
  (
    'China Announces Major Stimulus Package',
    'China',
    39.9042,
    116.4074,
    'High',
    'Macro',
    'Chinese government unveils $500 billion stimulus package targeting infrastructure and technology sectors. Expected to boost regional growth and commodity demand.',
    'Bullish CNY, bullish commodities',
    '[
      {"pair": "USD/CNY", "direction": -1, "magnitude": "Large", "movePercent": "-1.5%", "reasoning": "Yuan strengthens on stimulus news"},
      {"pair": "AUD/USD", "direction": 1, "magnitude": "Medium", "movePercent": "+0.9%", "reasoning": "Australian dollar benefits from China exposure"}
    ]'::jsonb,
    88,
    true,
    NOW() - INTERVAL '5 hours',
    NOW() + INTERVAL '43 hours',
    'manual'
  ),
  (
    'UK Inflation Drops Below Target',
    'United Kingdom',
    51.5074,
    -0.1278,
    'Medium',
    'Macro',
    'UK inflation falls to 1.8%, below the Bank of England 2% target for the first time in three years. Raises expectations for monetary policy easing.',
    'Bearish GBP',
    '[
      {"pair": "GBP/USD", "direction": -1, "magnitude": "Medium", "movePercent": "-0.7%", "reasoning": "Pound weakens on rate cut expectations"},
      {"pair": "EUR/GBP", "direction": 1, "magnitude": "Small", "movePercent": "+0.3%", "reasoning": "Euro gains against pound"}
    ]'::jsonb,
    85,
    true,
    NOW() - INTERVAL '8 hours',
    NOW() + INTERVAL '40 hours',
    'manual'
  ),
  (
    'Japan GDP Growth Exceeds Expectations',
    'Japan',
    35.6762,
    139.6503,
    'Medium',
    'Macro',
    'Japanese economy grows 2.1% in Q1, beating forecasts of 1.5%. Strong export performance and domestic consumption drive growth.',
    'Bullish JPY',
    '[
      {"pair": "USD/JPY", "direction": -1, "magnitude": "Medium", "movePercent": "-0.6%", "reasoning": "Yen strengthens on strong GDP data"},
      {"pair": "EUR/JPY", "direction": -1, "magnitude": "Small", "movePercent": "-0.4%", "reasoning": "Yen gains across the board"}
    ]'::jsonb,
    90,
    false,
    NOW() - INTERVAL '12 hours',
    NOW() + INTERVAL '36 hours',
    'manual'
  ),
  (
    'Major Earthquake Strikes Turkey',
    'Turkey',
    39.9334,
    32.8597,
    'High',
    'Natural Disaster',
    'A 6.8 magnitude earthquake hits central Turkey, causing significant damage and casualties. Emergency response underway.',
    'Bearish TRY',
    '[
      {"pair": "USD/TRY", "direction": 1, "magnitude": "Large", "movePercent": "+2.3%", "reasoning": "Turkish lira weakens on disaster impact"},
      {"pair": "EUR/TRY", "direction": 1, "magnitude": "Medium", "movePercent": "+1.8%", "reasoning": "Flight to safety from Turkish assets"}
    ]'::jsonb,
    95,
    true,
    NOW() - INTERVAL '1 hour',
    NOW() + INTERVAL '47 hours',
    'manual'
  ),
  (
    'EU Announces New Trade Agreement with India',
    'Belgium',
    50.8503,
    4.3517,
    'Medium',
    'Geopolitical',
    'European Union and India finalize comprehensive trade deal, reducing tariffs on key goods and services. Expected to boost bilateral trade by 30%.',
    'Bullish EUR, Bullish INR',
    '[
      {"pair": "EUR/USD", "direction": 1, "magnitude": "Small", "movePercent": "+0.3%", "reasoning": "Euro gains on positive trade news"},
      {"pair": "USD/INR", "direction": -1, "magnitude": "Small", "movePercent": "-0.5%", "reasoning": "Rupee strengthens on trade deal"}
    ]'::jsonb,
    82,
    false,
    NOW() - INTERVAL '15 hours',
    NOW() + INTERVAL '33 hours',
    'manual'
  ),
  (
    'Brazil Central Bank Raises Interest Rates',
    'Brazil',
    -15.8267,
    -47.9218,
    'Low',
    'Central Bank',
    'Banco Central do Brasil increases benchmark rate by 50 basis points to combat inflation pressures. Move surprises markets.',
    'Bullish BRL',
    '[
      {"pair": "USD/BRL", "direction": -1, "magnitude": "Medium", "movePercent": "-0.9%", "reasoning": "Real strengthens on hawkish central bank"},
      {"pair": "EUR/BRL", "direction": -1, "magnitude": "Small", "movePercent": "-0.6%", "reasoning": "Real gains across major pairs"}
    ]'::jsonb,
    87,
    false,
    NOW() - INTERVAL '20 hours',
    NOW() + INTERVAL '28 hours',
    'manual'
  ),
  (
    'Australia Unemployment Rate Hits Record Low',
    'Australia',
    -35.2809,
    149.1300,
    'Low',
    'Macro',
    'Australian unemployment drops to 3.5%, lowest in 50 years. Tight labor market raises wage growth concerns.',
    'Bullish AUD',
    '[
      {"pair": "AUD/USD", "direction": 1, "magnitude": "Small", "movePercent": "+0.4%", "reasoning": "Aussie dollar gains on strong employment"},
      {"pair": "AUD/JPY", "direction": 1, "magnitude": "Small", "movePercent": "+0.5%", "reasoning": "AUD strengthens against yen"}
    ]'::jsonb,
    84,
    false,
    NOW() - INTERVAL '18 hours',
    NOW() + INTERVAL '30 hours',
    'manual'
  );

-- Insert some forex cache data (top movers)
INSERT INTO public.forex_cache (
  pair,
  current_price,
  change_24h,
  change_percent_24h,
  sparkline_data,
  driving_event_id,
  driving_event_headline,
  last_updated
) VALUES
  (
    'USD/TRY',
    34.2567,
    0.7823,
    2.34,
    '[33.8, 33.9, 34.0, 34.1, 33.95, 34.05, 34.15, 34.2, 34.25, 34.3, 34.28, 34.26]'::jsonb,
    (SELECT id FROM public.events WHERE headline LIKE '%Turkey%' LIMIT 1),
    'Major Earthquake Strikes Turkey',
    NOW()
  ),
  (
    'USD/CNY',
    7.1234,
    -0.1067,
    -1.48,
    '[7.23, 7.22, 7.21, 7.20, 7.19, 7.18, 7.17, 7.15, 7.14, 7.13, 7.125, 7.123]'::jsonb,
    (SELECT id FROM public.events WHERE headline LIKE '%China%' LIMIT 1),
    'China Announces Major Stimulus Package',
    NOW()
  ),
  (
    'EUR/USD',
    1.0823,
    -0.0130,
    -1.19,
    '[1.095, 1.093, 1.091, 1.089, 1.087, 1.085, 1.084, 1.083, 1.082, 1.0825, 1.0823, 1.0823]'::jsonb,
    (SELECT id FROM public.events WHERE headline LIKE '%Federal Reserve%' LIMIT 1),
    'Federal Reserve Signals Rate Cuts in 2026',
    NOW()
  ),
  (
    'USD/BRL',
    5.6234,
    -0.0506,
    -0.89,
    '[5.67, 5.66, 5.65, 5.64, 5.635, 5.63, 5.628, 5.625, 5.623, 5.624, 5.623, 5.623]'::jsonb,
    (SELECT id FROM public.events WHERE headline LIKE '%Brazil%' LIMIT 1),
    'Brazil Central Bank Raises Interest Rates',
    NOW()
  ),
  (
    'USD/JPY',
    149.8234,
    0.1198,
    0.80,
    '[149.7, 149.72, 149.75, 149.78, 149.80, 149.82, 149.81, 149.80, 149.82, 149.83, 149.82, 149.82]'::jsonb,
    (SELECT id FROM public.events WHERE headline LIKE '%Federal Reserve%' LIMIT 1),
    'Federal Reserve Signals Rate Cuts in 2026',
    NOW()
  );

-- Success message
SELECT 'Test data inserted successfully! Refresh your browser.' as message;
