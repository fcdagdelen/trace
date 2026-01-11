// Database types for Supabase tables
// Generated from Supabase schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      trace_injections: {
        Row: {
          after_line_sequence: number | null
          content: string
          id: string
          injected_at: string | null
          trace_id: string | null
        }
        Insert: {
          after_line_sequence?: number | null
          content: string
          id?: string
          injected_at?: string | null
          trace_id?: string | null
        }
        Update: {
          after_line_sequence?: number | null
          content?: string
          id?: string
          injected_at?: string | null
          trace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trace_injections_trace_id_fkey"
            columns: ["trace_id"]
            isOneToOne: false
            referencedRelation: "traces"
            referencedColumns: ["id"]
          },
        ]
      }
      trace_lines: {
        Row: {
          content: string
          depth: number | null
          id: string
          is_symbol: boolean | null
          metadata: Json | null
          method_hint: string | null
          relative_time_ms: number | null
          sequence: number
          trace_id: string | null
          typing_duration_ms: number | null
        }
        Insert: {
          content: string
          depth?: number | null
          id?: string
          is_symbol?: boolean | null
          metadata?: Json | null
          method_hint?: string | null
          relative_time_ms?: number | null
          sequence: number
          trace_id?: string | null
          typing_duration_ms?: number | null
        }
        Update: {
          content?: string
          depth?: number | null
          id?: string
          is_symbol?: boolean | null
          metadata?: Json | null
          method_hint?: string | null
          relative_time_ms?: number | null
          sequence?: number
          trace_id?: string | null
          typing_duration_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trace_lines_trace_id_fkey"
            columns: ["trace_id"]
            isOneToOne: false
            referencedRelation: "traces"
            referencedColumns: ["id"]
          },
        ]
      }
      traces: {
        Row: {
          completed_at: string | null
          created_at: string | null
          depth_range: unknown
          dominant_method: string | null
          id: string
          line_count: number | null
          method_ids: string[]
          query: string
          started_at: string | null
          symbol_count: number | null
          tension_score: number | null
          total_duration_ms: number | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          depth_range?: unknown
          dominant_method?: string | null
          id?: string
          line_count?: number | null
          method_ids: string[]
          query: string
          started_at?: string | null
          symbol_count?: number | null
          tension_score?: number | null
          total_duration_ms?: number | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          depth_range?: unknown
          dominant_method?: string | null
          id?: string
          line_count?: number | null
          method_ids?: string[]
          query?: string
          started_at?: string | null
          symbol_count?: number | null
          tension_score?: number | null
          total_duration_ms?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Metadata stored in trace_lines.metadata JSONB
export interface TraceLineMetadata {
  tension?: {
    detected: boolean;
    markers: string[];
    explicit: boolean;
  };
  depthVector?: {
    abstraction: number;
    interiority: number;
  };
  convergence?: {
    detected: boolean;
    methods: string[];
  };
  methodTransition?: {
    from: string | null;
    to: string | null;
  };
}

// Convenience type aliases
export type Trace = Database['public']['Tables']['traces']['Row'];
export type TraceInsert = Database['public']['Tables']['traces']['Insert'];
export type TraceUpdate = Database['public']['Tables']['traces']['Update'];

export type TraceLine = Database['public']['Tables']['trace_lines']['Row'];
export type TraceLineInsert = Database['public']['Tables']['trace_lines']['Insert'];
export type TraceLineUpdate = Database['public']['Tables']['trace_lines']['Update'];

export type TraceInjection = Database['public']['Tables']['trace_injections']['Row'];
export type TraceInjectionInsert = Database['public']['Tables']['trace_injections']['Insert'];
