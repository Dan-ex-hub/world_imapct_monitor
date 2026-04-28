// Generated types for Supabase database schema
// This file should be regenerated when the database schema changes
// Run: npx supabase gen types typescript --project-id <project-id> > src/types/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

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
          impact_level: 'Critical' | 'High' | 'Medium' | 'Low'
          category: 'Geopolitical' | 'Central Bank' | 'Macro' | 'Political' | 'Crisis' | 'Sanctions' | 'Earnings' | 'Natural Disaster'
          summary: string
          sentiment: string
          forex_impacts: Json
          confidence_score: number
          is_market_moving: boolean
          published_at: string
          expires_at: string
          source_url: string | null
          created_by: 'ai-auto' | 'ai-confirmed' | 'manual'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          headline: string
          country: string
          lat: number
          lon: number
          impact_level: 'Critical' | 'High' | 'Medium' | 'Low'
          category: 'Geopolitical' | 'Central Bank' | 'Macro' | 'Political' | 'Crisis' | 'Sanctions' | 'Earnings' | 'Natural Disaster'
          summary: string
          sentiment: string
          forex_impacts?: Json
          confidence_score: number
          is_market_moving?: boolean
          published_at?: string
          expires_at: string
          source_url?: string | null
          created_by: 'ai-auto' | 'ai-confirmed' | 'manual'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          headline?: string
          country?: string
          lat?: number
          lon?: number
          impact_level?: 'Critical' | 'High' | 'Medium' | 'Low'
          category?: 'Geopolitical' | 'Central Bank' | 'Macro' | 'Political' | 'Crisis' | 'Sanctions' | 'Earnings' | 'Natural Disaster'
          summary?: string
          sentiment?: string
          forex_impacts?: Json
          confidence_score?: number
          is_market_moving?: boolean
          published_at?: string
          expires_at?: string
          source_url?: string | null
          created_by?: 'ai-auto' | 'ai-confirmed' | 'manual'
          created_at?: string
          updated_at?: string
        }
      }
      forex_pairs: {
        Row: {
          id: string
          pair: string
          current_price: number
          change_24h: number
          change_percent_24h: number
          sparkline_data: Json
          driving_event_id: string | null
          driving_event_headline: string | null
          last_updated: string
          created_at: string
        }
        Insert: {
          id?: string
          pair: string
          current_price: number
          change_24h: number
          change_percent_24h: number
          sparkline_data?: Json
          driving_event_id?: string | null
          driving_event_headline?: string | null
          last_updated?: string
          created_at?: string
        }
        Update: {
          id?: string
          pair?: string
          current_price?: number
          change_24h?: number
          change_percent_24h?: number
          sparkline_data?: Json
          driving_event_id?: string | null
          driving_event_headline?: string | null
          last_updated?: string
          created_at?: string
        }
      }
      env_data_cache: {
        Row: {
          layer_type: 'wind' | 'aqi' | 'earthquakes' | 'wildfires' | 'storms' | 'sea_temp' | 'temp_anomaly'
          data: Json
          fetched_at: string
          expires_at: string
        }
        Insert: {
          layer_type: 'wind' | 'aqi' | 'earthquakes' | 'wildfires' | 'storms' | 'sea_temp' | 'temp_anomaly'
          data: Json
          fetched_at?: string
          expires_at: string
        }
        Update: {
          layer_type?: 'wind' | 'aqi' | 'earthquakes' | 'wildfires' | 'storms' | 'sea_temp' | 'temp_anomaly'
          data?: Json
          fetched_at?: string
          expires_at?: string
        }
      }
      aqi_history: {
        Row: {
          id: string
          city: string
          country: string
          lat: number | null
          lon: number | null
          aqi: number
          pm25: number | null
          recorded_at: string
        }
        Insert: {
          id?: string
          city: string
          country: string
          lat?: number | null
          lon?: number | null
          aqi: number
          pm25?: number | null
          recorded_at?: string
        }
        Update: {
          id?: string
          city?: string
          country?: string
          lat?: number | null
          lon?: number | null
          aqi?: number
          pm25?: number | null
          recorded_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
          updated_at?: string
        }
      }
      watchlist: {
        Row: {
          id: string
          user_id: string
          type: 'country' | 'forex_pair' | 'event'
          value: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'country' | 'forex_pair' | 'event'
          value: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'country' | 'forex_pair' | 'event'
          value?: string
          created_at?: string
        }
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          p256dh?: string
          auth?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_events: {
        Args: Record<string, never>
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
