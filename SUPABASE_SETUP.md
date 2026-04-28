# Supabase Setup Guide for ImpactGlobe

This guide walks you through setting up Supabase for the ImpactGlobe project.

## Prerequisites

- A Supabase account (free tier is sufficient)
- Node.js and npm installed

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in the details:
   - **Name**: `impactglobe` (or your preferred name)
   - **Database Password**: Generate a strong password and save it securely
   - **Region**: Choose the region closest to your users
   - **Pricing Plan**: Free tier is sufficient for development

4. Wait for the project to be created (takes ~2 minutes)

## Step 2: Run the Database Schema

1. In your Supabase project dashboard, go to the **SQL Editor**
2. Click "New Query"
3. Copy the entire contents of `supabase-schema.sql` from the project root
4. Paste it into the SQL editor
5. Click "Run" to execute the schema

This will create all the necessary tables, indexes, RLS policies, and functions.

## Step 3: Get Your API Keys

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (starts with `eyJ...`)
   - **service_role** key (starts with `eyJ...`) - **Keep this secret!**

## Step 4: Update Environment Variables

1. Open `.env.local` in your project root
2. Replace the placeholder values with your actual Supabase credentials:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

3. Save the file
4. Restart your development server: `npm run dev`

## Step 5: Enable Realtime

1. In your Supabase project dashboard, go to **Database** → **Replication**
2. Find the `events` table in the list
3. Toggle the switch to enable realtime for the `events` table
4. Do the same for the `forex_pairs` table

Alternatively, the schema already includes the necessary publication commands, so realtime should be enabled automatically.

## Step 6: Verify the Setup

1. Start your development server: `npm run dev`
2. Open the browser console (F12)
3. Look for log messages like:
   ```
   [Realtime] Loaded X initial events
   [Realtime] Subscription status: SUBSCRIBED
   ```

If you see these messages, your Supabase connection is working!

## Step 7: (Optional) Seed Test Data

You can manually insert test events through the Supabase dashboard:

1. Go to **Table Editor** → **events**
2. Click "Insert row"
3. Fill in the required fields:
   - `headline`: "Test Event"
   - `country`: "United States"
   - `lat`: 40.7128
   - `lon`: -74.0060
   - `impact_level`: "High"
   - `category`: "Geopolitical"
   - `summary`: "This is a test event"
   - `sentiment`: "Neutral"
   - `confidence_score`: 0.85
   - `expires_at`: Set to a future date (e.g., 7 days from now)
   - `created_by`: "manual"

4. Click "Save"
5. The event should appear on your globe in real-time!

## Troubleshooting

### "Failed to fetch initial events"
- Check that your API keys are correct in `.env.local`
- Verify the schema was executed successfully
- Check the browser console for detailed error messages

### "Subscription status: CHANNEL_ERROR"
- Ensure realtime is enabled for the `events` table
- Check your Supabase project's realtime quotas (free tier has limits)
- Verify your network connection

### RLS Policy Errors
- The schema includes RLS policies that allow public read access
- If you're getting permission errors, check the RLS policies in **Authentication** → **Policies**

## Next Steps

Once Supabase is set up:
- Phase 4: Implement the AI pipeline for automatic event generation
- Phase 5: Integrate forex data from Twelve Data API
- Phase 6: Add environmental data layers
- Phase 7: Implement authentication and user features

## Useful Supabase Commands

```bash
# Install Supabase CLI (optional, for local development)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-id

# Generate TypeScript types from your schema
supabase gen types typescript --project-id your-project-id > src/types/database.types.ts

# Run migrations (if you create migration files)
supabase db push
```

## Security Notes

- **Never commit** `.env.local` to version control
- The `service_role` key bypasses RLS - only use it in secure server contexts
- The `anon` key is safe to expose in client-side code
- RLS policies protect your data even with the anon key exposed

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js with Supabase](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
