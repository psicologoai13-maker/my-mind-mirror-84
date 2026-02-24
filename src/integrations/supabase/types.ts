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
      aria_knowledge_base: {
        Row: {
          category: string
          content: string
          created_at: string | null
          id: string
          is_active: boolean | null
          keywords: string[] | null
          priority: number | null
          title: string
          topic: string
          updated_at: string | null
        }
        Insert: {
          category: string
          content: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          keywords?: string[] | null
          priority?: number | null
          title: string
          topic: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          keywords?: string[] | null
          priority?: number | null
          title?: string
          topic?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      aria_response_feedback: {
        Row: {
          context_appropriateness: number | null
          created_at: string
          explicit_feedback: string | null
          id: string
          response_length: number | null
          response_text: string
          response_type: string | null
          session_id: string | null
          user_id: string
          user_reaction: string | null
          was_helpful: boolean | null
        }
        Insert: {
          context_appropriateness?: number | null
          created_at?: string
          explicit_feedback?: string | null
          id?: string
          response_length?: number | null
          response_text: string
          response_type?: string | null
          session_id?: string | null
          user_id: string
          user_reaction?: string | null
          was_helpful?: boolean | null
        }
        Update: {
          context_appropriateness?: number | null
          created_at?: string
          explicit_feedback?: string | null
          id?: string
          response_length?: number | null
          response_text?: string
          response_type?: string | null
          session_id?: string | null
          user_id?: string
          user_reaction?: string | null
          was_helpful?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "aria_response_feedback_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      body_metrics: {
        Row: {
          active_minutes: number | null
          blood_pressure_diastolic: number | null
          blood_pressure_systolic: number | null
          body_fat_percentage: number | null
          calories_burned: number | null
          created_at: string
          date: string
          hydration_level: number | null
          id: string
          muscle_mass: number | null
          notes: string | null
          resting_heart_rate: number | null
          sleep_hours: number | null
          steps: number | null
          updated_at: string
          user_id: string
          waist_circumference: number | null
          weight: number | null
        }
        Insert: {
          active_minutes?: number | null
          blood_pressure_diastolic?: number | null
          blood_pressure_systolic?: number | null
          body_fat_percentage?: number | null
          calories_burned?: number | null
          created_at?: string
          date?: string
          hydration_level?: number | null
          id?: string
          muscle_mass?: number | null
          notes?: string | null
          resting_heart_rate?: number | null
          sleep_hours?: number | null
          steps?: number | null
          updated_at?: string
          user_id: string
          waist_circumference?: number | null
          weight?: number | null
        }
        Update: {
          active_minutes?: number | null
          blood_pressure_diastolic?: number | null
          blood_pressure_systolic?: number | null
          body_fat_percentage?: number | null
          calories_burned?: number | null
          created_at?: string
          date?: string
          hydration_level?: number | null
          id?: string
          muscle_mass?: number | null
          notes?: string | null
          resting_heart_rate?: number | null
          sleep_hours?: number | null
          steps?: number | null
          updated_at?: string
          user_id?: string
          waist_circumference?: number | null
          weight?: number | null
        }
        Relationships: []
      }
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
      conversation_topics: {
        Row: {
          avoid_unless_introduced: boolean | null
          created_at: string
          first_mentioned_at: string
          id: string
          is_sensitive: boolean | null
          last_mentioned_at: string
          mention_count: number
          related_topics: string[] | null
          sentiment_avg: number | null
          session_ids: string[] | null
          topic: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avoid_unless_introduced?: boolean | null
          created_at?: string
          first_mentioned_at?: string
          id?: string
          is_sensitive?: boolean | null
          last_mentioned_at?: string
          mention_count?: number
          related_topics?: string[] | null
          sentiment_avg?: number | null
          session_ids?: string[] | null
          topic: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avoid_unless_introduced?: boolean | null
          created_at?: string
          first_mentioned_at?: string
          id?: string
          is_sensitive?: boolean | null
          last_mentioned_at?: string
          mention_count?: number
          related_topics?: string[] | null
          sentiment_avg?: number | null
          session_ids?: string[] | null
          topic?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          affection: number | null
          anger: number | null
          apathy: number | null
          created_at: string
          curiosity: number | null
          date: string
          disappointment: number | null
          disgust: number | null
          excitement: number | null
          fear: number | null
          frustration: number | null
          hope: number | null
          id: string
          jealousy: number | null
          joy: number | null
          nervousness: number | null
          nostalgia: number | null
          overwhelm: number | null
          pride: number | null
          recorded_at: string | null
          sadness: number | null
          serenity: number | null
          session_id: string | null
          shame: number | null
          source: string
          surprise: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          affection?: number | null
          anger?: number | null
          apathy?: number | null
          created_at?: string
          curiosity?: number | null
          date?: string
          disappointment?: number | null
          disgust?: number | null
          excitement?: number | null
          fear?: number | null
          frustration?: number | null
          hope?: number | null
          id?: string
          jealousy?: number | null
          joy?: number | null
          nervousness?: number | null
          nostalgia?: number | null
          overwhelm?: number | null
          pride?: number | null
          recorded_at?: string | null
          sadness?: number | null
          serenity?: number | null
          session_id?: string | null
          shame?: number | null
          source?: string
          surprise?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          affection?: number | null
          anger?: number | null
          apathy?: number | null
          created_at?: string
          curiosity?: number | null
          date?: string
          disappointment?: number | null
          disgust?: number | null
          excitement?: number | null
          fear?: number | null
          frustration?: number | null
          hope?: number | null
          id?: string
          jealousy?: number | null
          joy?: number | null
          nervousness?: number | null
          nostalgia?: number | null
          overwhelm?: number | null
          pride?: number | null
          recorded_at?: string | null
          sadness?: number | null
          serenity?: number | null
          session_id?: string | null
          shame?: number | null
          source?: string
          surprise?: number | null
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
      daily_habits: {
        Row: {
          created_at: string
          date: string
          habit_type: string
          id: string
          notes: string | null
          target_value: number | null
          unit: string | null
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          date?: string
          habit_type: string
          id?: string
          notes?: string | null
          target_value?: number | null
          unit?: string | null
          updated_at?: string
          user_id: string
          value?: number
        }
        Update: {
          created_at?: string
          date?: string
          habit_type?: string
          id?: string
          notes?: string | null
          target_value?: number | null
          unit?: string | null
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      daily_life_areas: {
        Row: {
          created_at: string
          date: string
          family: number | null
          finances: number | null
          growth: number | null
          health: number | null
          id: string
          leisure: number | null
          love: number | null
          school: number | null
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
          family?: number | null
          finances?: number | null
          growth?: number | null
          health?: number | null
          id?: string
          leisure?: number | null
          love?: number | null
          school?: number | null
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
          family?: number | null
          finances?: number | null
          growth?: number | null
          health?: number | null
          id?: string
          leisure?: number | null
          love?: number | null
          school?: number | null
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
      daily_psychology: {
        Row: {
          appetite_changes: number | null
          avoidance: number | null
          burnout_level: number | null
          compulsive_urges: number | null
          concentration: number | null
          confusion: number | null
          coping_ability: number | null
          created_at: string
          date: string
          dissociation: number | null
          emotional_regulation: number | null
          gratitude: number | null
          guilt: number | null
          hopelessness: number | null
          id: string
          intrusive_thoughts: number | null
          irritability: number | null
          life_satisfaction: number | null
          loneliness_perceived: number | null
          mental_clarity: number | null
          mindfulness: number | null
          motivation: number | null
          perceived_social_support: number | null
          procrastination: number | null
          racing_thoughts: number | null
          resilience: number | null
          rumination: number | null
          self_efficacy: number | null
          self_harm_urges: number | null
          self_worth: number | null
          sense_of_purpose: number | null
          session_id: string | null
          social_withdrawal: number | null
          somatic_tension: number | null
          source: string
          suicidal_ideation: number | null
          sunlight_exposure: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          appetite_changes?: number | null
          avoidance?: number | null
          burnout_level?: number | null
          compulsive_urges?: number | null
          concentration?: number | null
          confusion?: number | null
          coping_ability?: number | null
          created_at?: string
          date?: string
          dissociation?: number | null
          emotional_regulation?: number | null
          gratitude?: number | null
          guilt?: number | null
          hopelessness?: number | null
          id?: string
          intrusive_thoughts?: number | null
          irritability?: number | null
          life_satisfaction?: number | null
          loneliness_perceived?: number | null
          mental_clarity?: number | null
          mindfulness?: number | null
          motivation?: number | null
          perceived_social_support?: number | null
          procrastination?: number | null
          racing_thoughts?: number | null
          resilience?: number | null
          rumination?: number | null
          self_efficacy?: number | null
          self_harm_urges?: number | null
          self_worth?: number | null
          sense_of_purpose?: number | null
          session_id?: string | null
          social_withdrawal?: number | null
          somatic_tension?: number | null
          source?: string
          suicidal_ideation?: number | null
          sunlight_exposure?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          appetite_changes?: number | null
          avoidance?: number | null
          burnout_level?: number | null
          compulsive_urges?: number | null
          concentration?: number | null
          confusion?: number | null
          coping_ability?: number | null
          created_at?: string
          date?: string
          dissociation?: number | null
          emotional_regulation?: number | null
          gratitude?: number | null
          guilt?: number | null
          hopelessness?: number | null
          id?: string
          intrusive_thoughts?: number | null
          irritability?: number | null
          life_satisfaction?: number | null
          loneliness_perceived?: number | null
          mental_clarity?: number | null
          mindfulness?: number | null
          motivation?: number | null
          perceived_social_support?: number | null
          procrastination?: number | null
          racing_thoughts?: number | null
          resilience?: number | null
          rumination?: number | null
          self_efficacy?: number | null
          self_harm_urges?: number | null
          self_worth?: number | null
          sense_of_purpose?: number | null
          session_id?: string | null
          social_withdrawal?: number | null
          somatic_tension?: number | null
          source?: string
          suicidal_ideation?: number | null
          sunlight_exposure?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_psychology_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      device_push_tokens: {
        Row: {
          created_at: string
          device_token: string
          id: string
          is_active: boolean
          platform: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_token: string
          id?: string
          is_active?: boolean
          platform?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_token?: string
          id?: string
          is_active?: boolean
          platform?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      emotion_patterns: {
        Row: {
          confidence: number
          created_at: string
          data_points: number
          description: string
          detected_at: string
          id: string
          is_active: boolean | null
          last_validated_at: string | null
          pattern_type: string
          recommendations: string[] | null
          trigger_factors: string[] | null
          user_id: string
        }
        Insert: {
          confidence: number
          created_at?: string
          data_points?: number
          description: string
          detected_at?: string
          id?: string
          is_active?: boolean | null
          last_validated_at?: string | null
          pattern_type: string
          recommendations?: string[] | null
          trigger_factors?: string[] | null
          user_id: string
        }
        Update: {
          confidence?: number
          created_at?: string
          data_points?: number
          description?: string
          detected_at?: string
          id?: string
          is_active?: boolean | null
          last_validated_at?: string | null
          pattern_type?: string
          recommendations?: string[] | null
          trigger_factors?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      global_context_cache: {
        Row: {
          cache_key: string
          data: Json
          expires_at: string
          fetched_at: string
          id: string
        }
        Insert: {
          cache_key: string
          data?: Json
          expires_at: string
          fetched_at?: string
          id?: string
        }
        Update: {
          cache_key?: string
          data?: Json
          expires_at?: string
          fetched_at?: string
          id?: string
        }
        Relationships: []
      }
      habit_streaks: {
        Row: {
          created_at: string
          current_streak: number
          habit_type: string
          id: string
          last_completion_date: string | null
          longest_streak: number
          streak_broken_count: number
          total_completions: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          habit_type: string
          id?: string
          last_completion_date?: string | null
          longest_streak?: number
          streak_broken_count?: number
          total_completions?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          habit_type?: string
          id?: string
          last_completion_date?: string | null
          longest_streak?: number
          streak_broken_count?: number
          total_completions?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reward_transactions: {
        Row: {
          created_at: string
          description: string
          id: string
          points: number
          source_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          points: number
          source_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          points?: number
          source_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      session_context_snapshots: {
        Row: {
          action_items: string[] | null
          context_summary: string | null
          created_at: string
          dominant_emotion: string | null
          emotional_state: Json | null
          follow_up_needed: boolean | null
          id: string
          key_topics: string[] | null
          session_id: string
          session_quality_score: number | null
          unresolved_issues: string[] | null
          user_id: string
        }
        Insert: {
          action_items?: string[] | null
          context_summary?: string | null
          created_at?: string
          dominant_emotion?: string | null
          emotional_state?: Json | null
          follow_up_needed?: boolean | null
          id?: string
          key_topics?: string[] | null
          session_id: string
          session_quality_score?: number | null
          unresolved_issues?: string[] | null
          user_id: string
        }
        Update: {
          action_items?: string[] | null
          context_summary?: string | null
          created_at?: string
          dominant_emotion?: string | null
          emotional_state?: Json | null
          follow_up_needed?: boolean | null
          id?: string
          key_topics?: string[] | null
          session_id?: string
          session_quality_score?: number | null
          unresolved_issues?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_context_snapshots_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          ai_summary: string | null
          anxiety_score_detected: number | null
          clinical_indices: Json | null
          crisis_alert: boolean | null
          deep_psychology: Json | null
          duration: number | null
          emotion_breakdown: Json | null
          emotion_tags: string[] | null
          end_time: string | null
          energy_score_detected: number | null
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
          deep_psychology?: Json | null
          duration?: number | null
          emotion_breakdown?: Json | null
          emotion_tags?: string[] | null
          end_time?: string | null
          energy_score_detected?: number | null
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
          deep_psychology?: Json | null
          duration?: number | null
          emotion_breakdown?: Json | null
          emotion_tags?: string[] | null
          end_time?: string | null
          energy_score_detected?: number | null
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
      smart_notifications: {
        Row: {
          action_taken: string | null
          content: string
          created_at: string
          dismissed_at: string | null
          id: string
          priority: string
          read_at: string | null
          scheduled_for: string
          sent_at: string | null
          source_id: string | null
          source_type: string | null
          title: string | null
          trigger_type: string
          user_id: string
        }
        Insert: {
          action_taken?: string | null
          content: string
          created_at?: string
          dismissed_at?: string | null
          id?: string
          priority?: string
          read_at?: string | null
          scheduled_for: string
          sent_at?: string | null
          source_id?: string | null
          source_type?: string | null
          title?: string | null
          trigger_type: string
          user_id: string
        }
        Update: {
          action_taken?: string | null
          content?: string
          created_at?: string
          dismissed_at?: string | null
          id?: string
          priority?: string
          read_at?: string | null
          scheduled_for?: string
          sent_at?: string | null
          source_id?: string | null
          source_type?: string | null
          title?: string | null
          trigger_type?: string
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
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          metadata: Json | null
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          metadata?: Json | null
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          metadata?: Json | null
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_correlations: {
        Row: {
          correlation_type: string
          created_at: string
          id: string
          insight_text: string | null
          is_significant: boolean | null
          last_calculated_at: string
          metric_a: string
          metric_b: string
          p_value: number | null
          sample_size: number
          strength: number
          updated_at: string
          user_id: string
        }
        Insert: {
          correlation_type: string
          created_at?: string
          id?: string
          insight_text?: string | null
          is_significant?: boolean | null
          last_calculated_at?: string
          metric_a: string
          metric_b: string
          p_value?: number | null
          sample_size?: number
          strength: number
          updated_at?: string
          user_id: string
        }
        Update: {
          correlation_type?: string
          created_at?: string
          id?: string
          insight_text?: string | null
          is_significant?: boolean | null
          last_calculated_at?: string
          metric_a?: string
          metric_b?: string
          p_value?: number | null
          sample_size?: number
          strength?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_events: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          end_time: string | null
          event_date: string
          event_time: string | null
          event_type: string
          extracted_from_text: string | null
          follow_up_at: string | null
          follow_up_done: boolean | null
          follow_up_session_id: string | null
          id: string
          is_all_day: boolean | null
          is_recurring: boolean | null
          location: string | null
          metadata: Json | null
          recurrence_pattern: string | null
          reminder_enabled: boolean | null
          reminder_minutes_before: number | null
          source_session_id: string | null
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          event_date: string
          event_time?: string | null
          event_type?: string
          extracted_from_text?: string | null
          follow_up_at?: string | null
          follow_up_done?: boolean | null
          follow_up_session_id?: string | null
          id?: string
          is_all_day?: boolean | null
          is_recurring?: boolean | null
          location?: string | null
          metadata?: Json | null
          recurrence_pattern?: string | null
          reminder_enabled?: boolean | null
          reminder_minutes_before?: number | null
          source_session_id?: string | null
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          event_date?: string
          event_time?: string | null
          event_type?: string
          extracted_from_text?: string | null
          follow_up_at?: string | null
          follow_up_done?: boolean | null
          follow_up_session_id?: string | null
          id?: string
          is_all_day?: boolean | null
          is_recurring?: boolean | null
          location?: string | null
          metadata?: Json | null
          recurrence_pattern?: string | null
          reminder_enabled?: boolean | null
          reminder_minutes_before?: number | null
          source_session_id?: string | null
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_events_follow_up_session_id_fkey"
            columns: ["follow_up_session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_events_source_session_id_fkey"
            columns: ["source_session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_habits_config: {
        Row: {
          auto_sync_enabled: boolean | null
          created_at: string
          daily_target: number | null
          data_source: string | null
          habit_type: string
          id: string
          is_active: boolean
          last_auto_sync_at: string | null
          permission_granted: boolean | null
          reminder_enabled: boolean | null
          reminder_time: string | null
          requires_permission: boolean | null
          streak_type: string | null
          unit: string | null
          update_method: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_sync_enabled?: boolean | null
          created_at?: string
          daily_target?: number | null
          data_source?: string | null
          habit_type: string
          id?: string
          is_active?: boolean
          last_auto_sync_at?: string | null
          permission_granted?: boolean | null
          reminder_enabled?: boolean | null
          reminder_time?: string | null
          requires_permission?: boolean | null
          streak_type?: string | null
          unit?: string | null
          update_method?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_sync_enabled?: boolean | null
          created_at?: string
          daily_target?: number | null
          data_source?: string | null
          habit_type?: string
          id?: string
          is_active?: boolean
          last_auto_sync_at?: string | null
          permission_granted?: boolean | null
          reminder_enabled?: boolean | null
          reminder_time?: string | null
          requires_permission?: boolean | null
          streak_type?: string | null
          unit?: string | null
          update_method?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_interests: {
        Row: {
          career_goals: string[] | null
          children_count: number | null
          commute_time: number | null
          created_at: string | null
          creative_hobbies: string[] | null
          current_shows: string[] | null
          dietary_preferences: string[] | null
          dream_destinations: string[] | null
          emoji_preference: string | null
          favorite_artists: string[] | null
          favorite_athletes: string[] | null
          favorite_genres: string[] | null
          favorite_teams: string[] | null
          follows_football: boolean | null
          gaming_interests: string[] | null
          has_children: boolean | null
          humor_preference: string | null
          id: string
          important_dates: Json | null
          indoor_activities: string[] | null
          industry: string | null
          learning_interests: string[] | null
          living_situation: string | null
          music_genres: string[] | null
          news_sensitivity: string | null
          nickname: string | null
          outdoor_activities: string[] | null
          personal_values: string[] | null
          pet_owner: boolean | null
          pets: Json | null
          podcasts: string[] | null
          political_interest: boolean | null
          preferred_topics: string[] | null
          professional_interests: string[] | null
          recurring_events: Json | null
          relationship_status: string | null
          religion_spirituality: string | null
          response_length: string | null
          role_type: string | null
          sensitive_topics: string[] | null
          social_preference: string | null
          sports_followed: string[] | null
          travel_style: string | null
          updated_at: string | null
          user_id: string
          work_schedule: string | null
        }
        Insert: {
          career_goals?: string[] | null
          children_count?: number | null
          commute_time?: number | null
          created_at?: string | null
          creative_hobbies?: string[] | null
          current_shows?: string[] | null
          dietary_preferences?: string[] | null
          dream_destinations?: string[] | null
          emoji_preference?: string | null
          favorite_artists?: string[] | null
          favorite_athletes?: string[] | null
          favorite_genres?: string[] | null
          favorite_teams?: string[] | null
          follows_football?: boolean | null
          gaming_interests?: string[] | null
          has_children?: boolean | null
          humor_preference?: string | null
          id?: string
          important_dates?: Json | null
          indoor_activities?: string[] | null
          industry?: string | null
          learning_interests?: string[] | null
          living_situation?: string | null
          music_genres?: string[] | null
          news_sensitivity?: string | null
          nickname?: string | null
          outdoor_activities?: string[] | null
          personal_values?: string[] | null
          pet_owner?: boolean | null
          pets?: Json | null
          podcasts?: string[] | null
          political_interest?: boolean | null
          preferred_topics?: string[] | null
          professional_interests?: string[] | null
          recurring_events?: Json | null
          relationship_status?: string | null
          religion_spirituality?: string | null
          response_length?: string | null
          role_type?: string | null
          sensitive_topics?: string[] | null
          social_preference?: string | null
          sports_followed?: string[] | null
          travel_style?: string | null
          updated_at?: string | null
          user_id: string
          work_schedule?: string | null
        }
        Update: {
          career_goals?: string[] | null
          children_count?: number | null
          commute_time?: number | null
          created_at?: string | null
          creative_hobbies?: string[] | null
          current_shows?: string[] | null
          dietary_preferences?: string[] | null
          dream_destinations?: string[] | null
          emoji_preference?: string | null
          favorite_artists?: string[] | null
          favorite_athletes?: string[] | null
          favorite_genres?: string[] | null
          favorite_teams?: string[] | null
          follows_football?: boolean | null
          gaming_interests?: string[] | null
          has_children?: boolean | null
          humor_preference?: string | null
          id?: string
          important_dates?: Json | null
          indoor_activities?: string[] | null
          industry?: string | null
          learning_interests?: string[] | null
          living_situation?: string | null
          music_genres?: string[] | null
          news_sensitivity?: string | null
          nickname?: string | null
          outdoor_activities?: string[] | null
          personal_values?: string[] | null
          pet_owner?: boolean | null
          pets?: Json | null
          podcasts?: string[] | null
          political_interest?: boolean | null
          preferred_topics?: string[] | null
          professional_interests?: string[] | null
          recurring_events?: Json | null
          relationship_status?: string | null
          religion_spirituality?: string | null
          response_length?: string | null
          role_type?: string | null
          sensitive_topics?: string[] | null
          social_preference?: string | null
          sports_followed?: string[] | null
          travel_style?: string | null
          updated_at?: string | null
          user_id?: string
          work_schedule?: string | null
        }
        Relationships: []
      }
      user_memories: {
        Row: {
          category: string
          created_at: string
          extracted_at: string
          fact: string
          id: string
          importance: number
          is_active: boolean
          last_referenced_at: string | null
          metadata: Json | null
          source_session_id: string | null
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          extracted_at?: string
          fact: string
          id?: string
          importance?: number
          is_active?: boolean
          last_referenced_at?: string | null
          metadata?: Json | null
          source_session_id?: string | null
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          extracted_at?: string
          fact?: string
          id?: string
          importance?: number
          is_active?: boolean
          last_referenced_at?: string | null
          metadata?: Json | null
          source_session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_memories_source_session_id_fkey"
            columns: ["source_session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_objectives: {
        Row: {
          ai_custom_description: string | null
          ai_feedback: string | null
          ai_milestones: Json | null
          ai_progress_estimate: number | null
          auto_sync_enabled: boolean | null
          category: string
          checkin_visibility: string | null
          clarification_asked_at: string | null
          created_at: string | null
          current_value: number | null
          deadline: string | null
          description: string | null
          finance_tracking_type: string | null
          id: string
          input_method: string | null
          last_auto_sync_at: string | null
          linked_body_metric: string | null
          linked_habit: string | null
          needs_clarification: boolean | null
          preset_type: string | null
          progress_history: Json | null
          progress_source: string | null
          starting_value: number | null
          status: string | null
          target_value: number | null
          title: string
          tracking_period: string | null
          unit: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_custom_description?: string | null
          ai_feedback?: string | null
          ai_milestones?: Json | null
          ai_progress_estimate?: number | null
          auto_sync_enabled?: boolean | null
          category: string
          checkin_visibility?: string | null
          clarification_asked_at?: string | null
          created_at?: string | null
          current_value?: number | null
          deadline?: string | null
          description?: string | null
          finance_tracking_type?: string | null
          id?: string
          input_method?: string | null
          last_auto_sync_at?: string | null
          linked_body_metric?: string | null
          linked_habit?: string | null
          needs_clarification?: boolean | null
          preset_type?: string | null
          progress_history?: Json | null
          progress_source?: string | null
          starting_value?: number | null
          status?: string | null
          target_value?: number | null
          title: string
          tracking_period?: string | null
          unit?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_custom_description?: string | null
          ai_feedback?: string | null
          ai_milestones?: Json | null
          ai_progress_estimate?: number | null
          auto_sync_enabled?: boolean | null
          category?: string
          checkin_visibility?: string | null
          clarification_asked_at?: string | null
          created_at?: string | null
          current_value?: number | null
          deadline?: string | null
          description?: string | null
          finance_tracking_type?: string | null
          id?: string
          input_method?: string | null
          last_auto_sync_at?: string | null
          linked_body_metric?: string | null
          linked_habit?: string | null
          needs_clarification?: boolean | null
          preset_type?: string | null
          progress_history?: Json | null
          progress_source?: string | null
          starting_value?: number | null
          status?: string | null
          target_value?: number | null
          title?: string
          tracking_period?: string | null
          unit?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          active_dashboard_metrics: string[] | null
          ai_analysis_cache: Json | null
          ai_cache_updated_at: string | null
          ai_checkins_cache: Json | null
          ai_dashboard_cache: Json | null
          ai_insights_cache: Json | null
          appearance_settings: Json | null
          birth_date: string | null
          connection_code: string | null
          created_at: string
          dashboard_config: Json | null
          email: string | null
          gender: string | null
          height: number | null
          id: string
          last_data_change_at: string | null
          life_areas_scores: Json | null
          location_permission_granted: boolean | null
          long_term_memory: string[] | null
          name: string | null
          notification_settings: Json | null
          occupation_context: string | null
          onboarding_answers: Json | null
          onboarding_completed: boolean | null
          premium_type: string | null
          premium_until: string | null
          realtime_context_cache: Json | null
          realtime_context_updated_at: string | null
          referral_code: string | null
          selected_goals: string[] | null
          therapy_status: string | null
          user_id: string
          wellness_score: number | null
        }
        Insert: {
          active_dashboard_metrics?: string[] | null
          ai_analysis_cache?: Json | null
          ai_cache_updated_at?: string | null
          ai_checkins_cache?: Json | null
          ai_dashboard_cache?: Json | null
          ai_insights_cache?: Json | null
          appearance_settings?: Json | null
          birth_date?: string | null
          connection_code?: string | null
          created_at?: string
          dashboard_config?: Json | null
          email?: string | null
          gender?: string | null
          height?: number | null
          id?: string
          last_data_change_at?: string | null
          life_areas_scores?: Json | null
          location_permission_granted?: boolean | null
          long_term_memory?: string[] | null
          name?: string | null
          notification_settings?: Json | null
          occupation_context?: string | null
          onboarding_answers?: Json | null
          onboarding_completed?: boolean | null
          premium_type?: string | null
          premium_until?: string | null
          realtime_context_cache?: Json | null
          realtime_context_updated_at?: string | null
          referral_code?: string | null
          selected_goals?: string[] | null
          therapy_status?: string | null
          user_id: string
          wellness_score?: number | null
        }
        Update: {
          active_dashboard_metrics?: string[] | null
          ai_analysis_cache?: Json | null
          ai_cache_updated_at?: string | null
          ai_checkins_cache?: Json | null
          ai_dashboard_cache?: Json | null
          ai_insights_cache?: Json | null
          appearance_settings?: Json | null
          birth_date?: string | null
          connection_code?: string | null
          created_at?: string
          dashboard_config?: Json | null
          email?: string | null
          gender?: string | null
          height?: number | null
          id?: string
          last_data_change_at?: string | null
          life_areas_scores?: Json | null
          location_permission_granted?: boolean | null
          long_term_memory?: string[] | null
          name?: string | null
          notification_settings?: Json | null
          occupation_context?: string | null
          onboarding_answers?: Json | null
          onboarding_completed?: boolean | null
          premium_type?: string | null
          premium_until?: string | null
          realtime_context_cache?: Json | null
          realtime_context_updated_at?: string | null
          referral_code?: string | null
          selected_goals?: string[] | null
          therapy_status?: string | null
          user_id?: string
          wellness_score?: number | null
        }
        Relationships: []
      }
      user_referrals: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          points_awarded: boolean | null
          referral_code: string
          referred_active_days: number | null
          referred_id: string
          referrer_id: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          points_awarded?: boolean | null
          referral_code: string
          referred_active_days?: number | null
          referred_id: string
          referrer_id: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          points_awarded?: boolean | null
          referral_code?: string
          referred_active_days?: number | null
          referred_id?: string
          referrer_id?: string
          status?: string
        }
        Relationships: []
      }
      user_reward_points: {
        Row: {
          created_at: string
          id: string
          lifetime_points: number
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lifetime_points?: number
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lifetime_points?: number
          total_points?: number
          updated_at?: string
          user_id?: string
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
      add_reward_points: {
        Args: { p_points: number; p_user_id: string }
        Returns: undefined
      }
      find_patient_by_code: {
        Args: { _code: string }
        Returns: {
          name: string
          user_id: string
        }[]
      }
      generate_connection_code: { Args: never; Returns: string }
      generate_referral_code: { Args: never; Returns: string }
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
