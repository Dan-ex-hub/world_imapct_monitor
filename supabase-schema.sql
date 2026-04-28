-- ImpactGlobe Database Schema
-- Supabase PostgreSQL Schema for real-time geopolitical event tracking

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================================
-- EVENTS TABLE
-- ============================================================================
create table public.events (
  id uuid primary key default uuid_generate_v4(),
  headline text not null,
  country text not null,
  lat numeric(9,6) not null,
  lon numeric(9,6) not null,
  impact_level text not null check (impact_level in ('Critical', 'High', 'Medium', 'Low')),
  category text not null check (category in ('Geopolitical', 'Central Bank', 'Macro', 'Political', 'Crisis', 'Sanctions', 'Earnings', 'Natural Disaster')),
  summary text not null,
  sentiment text not null,
  forex_impacts jsonb not null default '[]'::jsonb,
  confidence_score numeric(3,2) not null check (confidence_score >= 0 and confidence_score <= 1),
  is_market_moving boolean not null default false,
  published_at timestamptz not null default now(),
  expires_at timestamptz not null,
  source_url text,
  created_by text not null check (created_by in ('ai-auto', 'ai-confirmed', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for events
create index idx_events_published_at on public.events(published_at desc);
create index idx_events_expires_at on public.events(expires_at);
create index idx_events_country on public.events(country);
create index idx_events_impact_level on public.events(impact_level);
create index idx_events_category on public.events(category);
create index idx_events_is_market_moving on public.events(is_market_moving) where is_market_moving = true;

-- Enable Row Level Security
alter table public.events enable row level security;

-- RLS Policies for events (read-only for all, write for authenticated)
create policy "Events are viewable by everyone"
  on public.events for select
  using (true);

create policy "Events can be inserted by authenticated users"
  on public.events for insert
  with check (auth.role() = 'authenticated');

create policy "Events can be updated by authenticated users"
  on public.events for update
  using (auth.role() = 'authenticated');

-- ============================================================================
-- EVENT FOREX IMPACTS TABLE (linked to events)
-- ============================================================================
create table public.event_forex_impacts (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  pair text not null,
  direction integer not null check (direction in (1, -1)),
  magnitude text not null check (magnitude in ('Large', 'Medium', 'Small')),
  move_percent text not null,
  reasoning text not null,
  created_at timestamptz not null default now()
);

-- Indexes for event_forex_impacts
create index idx_event_forex_impacts_event_id on public.event_forex_impacts(event_id);
create index idx_event_forex_impacts_pair on public.event_forex_impacts(pair);

-- Enable RLS
alter table public.event_forex_impacts enable row level security;

-- RLS Policies for event_forex_impacts
create policy "Event forex impacts are viewable by everyone"
  on public.event_forex_impacts for select
  using (true);

create policy "Event forex impacts can be inserted by authenticated users"
  on public.event_forex_impacts for insert
  with check (auth.role() = 'authenticated');

-- ============================================================================
-- FOREX CACHE TABLE (latest prices from Twelve Data)
-- ============================================================================
create table public.forex_cache (
  pair text primary key,
  current_price numeric(16,6),
  change_24h numeric(10,6),
  change_percent_24h numeric(8,4),
  sparkline_data jsonb,
  driving_event_id uuid references public.events(id) on delete set null,
  last_updated timestamptz not null default now()
);

-- Indexes for forex_cache
create index idx_forex_cache_last_updated on public.forex_cache(last_updated desc);
create index idx_forex_cache_change_percent on public.forex_cache(abs(change_percent_24h) desc);

-- Enable RLS
alter table public.forex_cache enable row level security;

-- RLS Policies for forex_cache
create policy "Forex cache is viewable by everyone"
  on public.forex_cache for select
  using (true);

create policy "Forex cache can be modified by service role"
  on public.forex_cache for all
  using (auth.role() = 'service_role');

-- ============================================================================
-- FOREX PAIRS TABLE (kept for backward compatibility)
-- ============================================================================
create table public.forex_pairs (
  id uuid primary key default uuid_generate_v4(),
  pair text not null unique,
  current_price numeric(12,6) not null,
  change_24h numeric(12,6) not null,
  change_percent_24h numeric(8,4) not null,
  sparkline_data jsonb not null default '[]'::jsonb,
  driving_event_id uuid references public.events(id) on delete set null,
  driving_event_headline text,
  last_updated timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Indexes for forex_pairs
create index idx_forex_pairs_pair on public.forex_pairs(pair);
create index idx_forex_pairs_last_updated on public.forex_pairs(last_updated desc);
create index idx_forex_pairs_change_percent on public.forex_pairs(abs(change_percent_24h) desc);

-- Enable RLS
alter table public.forex_pairs enable row level security;

-- RLS Policies for forex_pairs
create policy "Forex pairs are viewable by everyone"
  on public.forex_pairs for select
  using (true);

create policy "Forex pairs can be modified by service role"
  on public.forex_pairs for all
  using (auth.role() = 'service_role');

-- ============================================================================
-- ENVIRONMENTAL DATA CACHE TABLE
-- ============================================================================
create table public.env_data_cache (
  layer_type text primary key check (layer_type in ('wind','aqi','earthquakes','wildfires','storms','sea_temp','temp_anomaly')),
  data jsonb not null,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null
);

-- Index for env_data_cache
create index idx_env_cache_expires on public.env_data_cache(expires_at);

-- Enable RLS
alter table public.env_data_cache enable row level security;

-- RLS Policies for env_data_cache
create policy "Env data cache is viewable by everyone"
  on public.env_data_cache for select
  using (true);

create policy "Env data cache can be modified by service role"
  on public.env_data_cache for all
  using (auth.role() = 'service_role');

-- ============================================================================
-- AQI HISTORY TABLE (for sparklines)
-- ============================================================================
create table public.aqi_history (
  id uuid primary key default uuid_generate_v4(),
  city text not null,
  country text not null,
  lat numeric(9,6),
  lon numeric(9,6),
  aqi integer not null,
  pm25 numeric(8,2),
  recorded_at timestamptz not null default now()
);

-- Indexes for aqi_history
create index idx_aqi_history_city_time on public.aqi_history(city, recorded_at desc);
create index idx_aqi_history_recorded_at on public.aqi_history(recorded_at desc);

-- Enable RLS
alter table public.aqi_history enable row level security;

-- RLS Policies for aqi_history
create policy "AQI history is viewable by everyone"
  on public.aqi_history for select
  using (true);

create policy "AQI history can be inserted by service role"
  on public.aqi_history for insert
  with check (auth.role() = 'service_role');

-- ============================================================================
-- USERS TABLE (extends Supabase auth.users)
-- ============================================================================
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for users
create index idx_users_email on public.users(email);

-- Enable RLS
alter table public.users enable row level security;

-- RLS Policies for users
create policy "Users can view their own data"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update their own data"
  on public.users for update
  using (auth.uid() = id);

-- ============================================================================
-- WATCHLIST TABLE
-- ============================================================================
create table public.watchlist (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in ('country', 'forex_pair', 'event')),
  value text not null,
  created_at timestamptz not null default now()
);

-- Indexes for watchlist
create index idx_watchlist_user_id on public.watchlist(user_id);
create index idx_watchlist_type on public.watchlist(type);
create unique index idx_watchlist_user_type_value on public.watchlist(user_id, type, value);

-- Enable RLS
alter table public.watchlist enable row level security;

-- RLS Policies for watchlist
create policy "Users can view their own watchlist"
  on public.watchlist for select
  using (auth.uid() = user_id);

create policy "Users can insert into their own watchlist"
  on public.watchlist for insert
  with check (auth.uid() = user_id);

create policy "Users can delete from their own watchlist"
  on public.watchlist for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- PUSH SUBSCRIPTIONS TABLE
-- ============================================================================
create table public.push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- Indexes for push_subscriptions
create index idx_push_subscriptions_user_id on public.push_subscriptions(user_id);
create index idx_push_subscriptions_endpoint on public.push_subscriptions(endpoint);

-- Enable RLS
alter table public.push_subscriptions enable row level security;

-- RLS Policies for push_subscriptions
create policy "Users can view their own push subscriptions"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own push subscriptions"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own push subscriptions"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- RSS SOURCES TABLE
-- ============================================================================
create table public.rss_sources (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  url text not null unique,
  is_active boolean not null default true,
  last_polled_at timestamptz,
  created_at timestamptz not null default now()
);

-- Indexes for rss_sources
create index idx_rss_sources_is_active on public.rss_sources(is_active) where is_active = true;
create index idx_rss_sources_last_polled on public.rss_sources(last_polled_at);

-- Enable RLS
alter table public.rss_sources enable row level security;

-- RLS Policies for rss_sources
create policy "RSS sources are viewable by everyone"
  on public.rss_sources for select
  using (true);

create policy "RSS sources can be modified by service role"
  on public.rss_sources for all
  using (auth.role() = 'service_role');

-- ============================================================================
-- EVENT DEDUPLICATION LOG TABLE
-- ============================================================================
create table public.event_dedup_log (
  id uuid primary key default uuid_generate_v4(),
  source_headline text not null,
  source_url text,
  matched_event_id uuid references public.events(id) on delete set null,
  action text not null check (action in ('created', 'merged', 'skipped')),
  created_at timestamptz not null default now()
);

-- Indexes for event_dedup_log
create index idx_event_dedup_log_created_at on public.event_dedup_log(created_at desc);
create index idx_event_dedup_log_source_url on public.event_dedup_log(source_url);

-- Enable RLS
alter table public.event_dedup_log enable row level security;

-- RLS Policies for event_dedup_log
create policy "Event dedup log is viewable by authenticated users"
  on public.event_dedup_log for select
  using (auth.role() = 'authenticated');

create policy "Event dedup log can be inserted by service role"
  on public.event_dedup_log for insert
  with check (auth.role() = 'service_role');

-- ============================================================================
-- API KEYS TABLE (for API tier - future use)
-- ============================================================================
create table public.api_keys (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  key_hash text not null unique,
  key_prefix text not null,
  name text,
  last_used_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Indexes for api_keys
create index idx_api_keys_user_id on public.api_keys(user_id);
create index idx_api_keys_key_hash on public.api_keys(key_hash);
create index idx_api_keys_is_active on public.api_keys(is_active) where is_active = true;

-- Enable RLS
alter table public.api_keys enable row level security;

-- RLS Policies for api_keys
create policy "Users can view their own API keys"
  on public.api_keys for select
  using (auth.uid() = user_id);

create policy "Users can insert their own API keys"
  on public.api_keys for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own API keys"
  on public.api_keys for update
  using (auth.uid() = user_id);

create policy "Users can delete their own API keys"
  on public.api_keys for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger for events table
create trigger set_events_updated_at
  before update on public.events
  for each row
  execute function public.handle_updated_at();

-- Trigger for users table
create trigger set_users_updated_at
  before update on public.users
  for each row
  execute function public.handle_updated_at();

-- Function to automatically create user profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create user profile on auth.users insert
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Function to clean up expired events
create or replace function public.cleanup_expired_events()
returns void as $$
begin
  delete from public.events
  where expires_at < now();
end;
$$ language plpgsql security definer;

-- ============================================================================
-- REALTIME PUBLICATION
-- ============================================================================

-- Enable realtime for events table
alter publication supabase_realtime add table public.events;

-- Enable realtime for forex_pairs table
alter publication supabase_realtime add table public.forex_pairs;

-- ============================================================================
-- INITIAL DATA / SEED (Optional)
-- ============================================================================

-- You can add seed data here if needed for development
