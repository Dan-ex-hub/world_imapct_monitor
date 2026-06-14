const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Load env variables manually to avoid dependency issues
const envContent = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] ? match[2].trim() : '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseServiceKey = env['SUPABASE_SERVICE_ROLE_KEY'];
const adminSecret = env['ADMIN_SECRET'];

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Error: Supabase URL or Service Role Key missing in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false
  }
});

async function run() {
  console.log("Starting deletion of Supabase data...");

  // 1. Delete from forex_cache
  console.log("Clearing forex_cache table...");
  const { error: errorForex, count: countForex } = await supabase
    .from('forex_cache')
    .delete()
    .neq('pair', 'KEEP_NOTHING');
  if (errorForex) console.error("Error deleting forex_cache:", errorForex);
  else console.log("forex_cache cleared.");

  // 2. Delete from events
  console.log("Clearing events table...");
  const { error: errorEvents, count: countEvents } = await supabase
    .from('events')
    .delete()
    .neq('headline', 'KEEP_NOTHING');
  if (errorEvents) console.error("Error deleting events:", errorEvents);
  else console.log("events cleared.");

  // 3. Delete from env_data_cache
  console.log("Clearing env_data_cache table...");
  const { error: errorEnv, count: countEnv } = await supabase
    .from('env_data_cache')
    .delete()
    .neq('layer_type', 'KEEP_NOTHING');
  if (errorEnv) console.error("Error deleting env_data_cache:", errorEnv);
  else console.log("env_data_cache cleared.");

  // 4. Delete from aqi_history
  console.log("Clearing aqi_history table...");
  const { error: errorAqiHist, count: countAqiHist } = await supabase
    .from('aqi_history')
    .delete()
    .neq('city', 'KEEP_NOTHING');
  if (errorAqiHist) console.error("Error deleting aqi_history:", errorAqiHist);
  else console.log("aqi_history cleared.");

  console.log("All dynamic tables cleared in Supabase!");

  // Now, refetch all data from endpoints
  console.log("Triggering refetch of all data...");
  
  const headers = {
    'x-admin-secret': adminSecret
  };

  const endpoints = [
    { name: 'RSS News Poll', url: 'http://localhost:3000/api/rss/poll', headers: {} },
    { name: 'Forex Initialization', url: 'http://localhost:3000/api/forex/init', headers: headers },
    { name: 'Environmental Weather', url: 'http://localhost:3000/api/env/weather', headers: {} },
    { name: 'Environmental AQI', url: 'http://localhost:3000/api/env/aqi', headers: {} },
    { name: 'Environmental Sea Temp', url: 'http://localhost:3000/api/env/sea-temp', headers: {} },
    { name: 'Environmental Earthquakes', url: 'http://localhost:3000/api/env/earthquakes', headers: {} },
    { name: 'Environmental Storms', url: 'http://localhost:3000/api/env/storms', headers: {} },
    { name: 'Environmental Wildfires', url: 'http://localhost:3000/api/env/wildfires', headers: {} },
  ];

  for (const ep of endpoints) {
    console.log(`Calling ${ep.name} endpoint: ${ep.url}...`);
    try {
      const res = await fetch(ep.url, {
        method: 'GET',
        headers: ep.headers
      });
      const data = await res.json();
      console.log(`Result from ${ep.name}:`, JSON.stringify(data).slice(0, 300));
    } catch (err) {
      console.error(`Error calling ${ep.name}:`, err.message);
    }
  }

  console.log("All refetch tasks completed!");
}

run();
