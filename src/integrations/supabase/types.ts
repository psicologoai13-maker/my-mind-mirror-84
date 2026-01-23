export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          session_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_checkins: {
        Row: {
          created_at: string
          id: string
          mood_emoji: string
          mood_value: number
          notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mood_emoji: string
          mood_value: number
          notes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mood_emoji?: string
          mood_value?: number
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      daily_emotions: {
        Row: {
          anger: number | null
          apathy: number | null
          created_at: string
          date: string
          fear: number | null
          id: string
          joy: number | null
          sadness: number | null
          session_id: string | null
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          anger?: number | null
          apathy?: number | null
          created_at?: string
          date?: string
          fear?: number | null
          id?: string
          joy?: number | null
          sadness?: number | null
          session_id?: string | null
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          anger?: number | null
          apathy?: number | null
          created_at?: string
          date?: string
          fear?: number | null
          id?: string
          joy?: number | null
          sadness?: number | null
          session_id?: string | null
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_emotions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_life_areas: {
        Row: {
          created_at: string
          date: string
          growth: number | null
          health: number | null
          id: string
          love: number | null
          session_id: string | null
          social: number | null
          source: string
          updated_at: string
          user_id: string
          work: number | null
        }
        Insert: {
          created_at?: string
          date?: string
          growth?: number | null
          health?: number | null
          id?: string
          love?: number | null
          session_id?: string | null
          social?: number | null
          source?: string
          updated_at?: string
          user_id: string
          work?: number | null
        }
        Update: {
          created_at?: string
          date?: string
          growth?: number | null
          health?: number | null
          id?: string
          love?: number | null
          session_id?: string | null
          social?: number | null
          source?: string
          updated_at?: string
          user_id?: string
          work?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_life_areas_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_patient_access: {
        Row: {
          access_granted_at: string
          doctor_id: string
          id: string
          is_active: boolean
          patient_id: string
        }
        Insert: {
          access_granted_at?: string
          doctor_id: string
          id?: string
          is_active?: boolean
          patient_id: string
        }
        Update: {
          access_granted_at?: string
          doctor_id?: string
          id?: string
          is_active?: boolean
          patient_id?: string
        }
        Relationships: []
      }
      doctor_share_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          is_active: boolean
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: string
          is_active?: boolean
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          user_id?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          ai_summary: string | null
          anxiety_score_detected: number | null
          clinical_indices: Json | null
          crisis_alert: boolean | null
          duration: number | null
          emotion_breakdown: Json | null
          emotion_tags: string[] | null
          end_time: string | null
          id: string
          insights: string | null
          key_events: string[] | null
          life_balance_scores: Json | null
          mood_score_detected: number | null
          sleep_quality: number | null
          specific_emotions: Json | null
          start_time: string
          status: string | null
          transcript: string | null
          type: string
          user_id: string
        }
        Insert: {
          ai_summary?: string | null
          anxiety_score_detected?: number | null
          clinical_indices?: Json | null
          crisis_alert?: boolean | null
          duration?: number | null
          emotion_breakdown?: Json | null
          emotion_tags?: string[] | null
          end_time?: string | null
          id?: string
          insights?: string | null
          key_events?: string[] | null
          life_balance_scores?: Json | null
          mood_score_detected?: number | null
          sleep_quality?: number | null
          specific_emotions?: Json | null
          start_time?: string
          status?: string | null
          transcript?: string | null
          type?: string
          user_id: string
        }
        Update: {
          ai_summary?: string | null
          anxiety_score_detected?: number | null
          clinical_indices?: Json | null
          crisis_alert?: boolean | null
          duration?: number | null
          emotion_breakdown?: Json | null
          emotion_tags?: string[] | null
          end_time?: string | null
          id?: string
          insights?: string | null
          key_events?: string[] | null
          life_balance_scores?: Json | null
          mood_score_detected?: number | null
          sleep_quality?: number | null
          specific_emotions?: Json | null
          start_time?: string
          status?: string | null
          transcript?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      shared_access: {
        Row: {
          access_count: number
          created_at: string
          expires_at: string
          id: string
          is_active: boolean
          last_accessed_at: string | null
          token: string
          user_id: string
        }
        Insert: {
          access_count?: number
          created_at?: string
          expires_at: string
          id?: string
          is_active?: boolean
          last_accessed_at?: string | null
          token: string
          user_id: string
        }
        Update: {
          access_count?: number
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          last_accessed_at?: string | null
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      thematic_diaries: {
        Row: {
          created_at: string
          id: string
          last_message_preview: string | null
          last_updated_at: string
          messages: Json
          theme: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_preview?: string | null
          last_updated_at?: string
          messages?: Json
          theme: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_preview?: string | null
          last_updated_at?: string
          messages?: Json
          theme?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          active_dashboard_metrics: string[] | null
          connection_code: string | null
          created_at: string
          email: string | null
          id: string
          life_areas_scores: Json | null
          long_term_memory: string[] | null
          name: string | null
          onboarding_answers: Json | null
          onboarding_completed: boolean | null
          selected_goals: string[] | null
          user_id: string
          wellness_score: number | null
        }
        Insert: {
          active_dashboard_metrics?: string[] | null
          connection_code?: string | null
          created_at?: string
          email?: string | null
          id?: string
          life_areas_scores?: Json | null
          long_term_memory?: string[] | null
          name?: string | null
          onboarding_answers?: Json | null
          onboarding_completed?: boolean | null
          selected_goals?: string[] | null
          user_id: string
          wellness_score?: number | null
        }
        Update: {
          active_dashboard_metrics?: string[] | null
          connection_code?: string | null
          created_at?: string
          email?: string | null
          id?: string
          life_areas_scores?: Json | null
          long_term_memory?: string[] | null
          name?: string | null
          onboarding_answers?: Json | null
          onboarding_completed?: boolean | null
          selected_goals?: string[] | null
          user_id?: string
          wellness_score?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      find_patient_by_code: {
        Args: { _code: string }
        Returns: {
          name: string
          user_id: string
        }[]
      }
      generate_connection_code: { Args: never; Returns: string }
      get_daily_metrics: {
        Args: { p_date?: string; p_user_id: string }
        Returns: Json
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "patient" | "doctor"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["patient", "doctor"],
    },
  },
} as const
