/** Database types generated from Supabase schema */

export interface Database {
  public: {
    Tables: {
      events: {
        Row: {
          id: string
          headline: string
          country: string
          lat: number
          lon: number
          impact_level: string
          category: string
          summary: string
          sentiment: string
          forex_impacts: Record<string, unknown>[]
          confidence_score: number
          is_market_moving: boolean
          published_at: string
          expires_at: string
          source_url: string | null
          created_by: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['events']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['events']['Row']>
      }
      forex_prices: {
        Row: {
          pair: string
          price: number
          change_24h: number
          change_percent_24h: number
          sparkline_data: number[]
          driving_event_id: string | null
          driving_event_headline: string | null
          updated_at: string
        }
        Insert: Database['public']['Tables']['forex_prices']['Row']
        Update: Partial<Database['public']['Tables']['forex_prices']['Row']>
      }
      watchlist: {
        Row: {
          id: string
          user_id: string
          type: string
          value: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['watchlist']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['watchlist']['Row']>
      }
      env_data_cache: {
        Row: {
          layer_type: string
          data: Record<string, unknown>
          fetched_at: string
          expires_at: string
        }
        Insert: Database['public']['Tables']['env_data_cache']['Row']
        Update: Partial<Database['public']['Tables']['env_data_cache']['Row']>
      }
      aqi_history: {
        Row: {
          id: string
          city: string
          country: string
          lat: number
          lon: number
          aqi: number
          pm25: number
          recorded_at: string
        }
        Insert: Omit<Database['public']['Tables']['aqi_history']['Row'], 'id' | 'recorded_at'>
        Update: Partial<Database['public']['Tables']['aqi_history']['Row']>
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          keys: Record<string, string>
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['push_subscriptions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['push_subscriptions']['Row']>
      }
    }
  }
}
