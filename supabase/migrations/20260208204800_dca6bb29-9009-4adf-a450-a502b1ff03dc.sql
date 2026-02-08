-- =====================================================
-- ARIA ARCHITECTURAL IMPROVEMENTS - COMPLETE MIGRATION
-- =====================================================

-- 1. USER_MEMORIES - Memoria strutturata con categorie
CREATE TABLE public.user_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL CHECK (category IN ('persona', 'hobby', 'viaggio', 'lavoro', 'evento', 'preferenza', 'salute', 'relazione', 'obiettivo')),
  fact text NOT NULL,
  importance integer NOT NULL DEFAULT 5 CHECK (importance >= 1 AND importance <= 10),
  source_session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
  extracted_at timestamptz NOT NULL DEFAULT now(),
  last_referenced_at timestamptz DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own memories" ON public.user_memories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own memories" ON public.user_memories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own memories" ON public.user_memories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own memories" ON public.user_memories FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Doctors can view patient memories" ON public.user_memories FOR SELECT USING (
  EXISTS (SELECT 1 FROM doctor_patient_access WHERE patient_id = user_memories.user_id AND doctor_id = auth.uid() AND is_active = true)
);

CREATE INDEX idx_user_memories_user_category ON public.user_memories(user_id, category);
CREATE INDEX idx_user_memories_importance ON public.user_memories(user_id, importance DESC);
CREATE INDEX idx_user_memories_active ON public.user_memories(user_id, is_active) WHERE is_active = true;

-- 2. SESSION_CONTEXT_SNAPSHOTS - Contesto sessioni migliorato
CREATE TABLE public.session_context_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  key_topics text[] DEFAULT '{}',
  emotional_state jsonb DEFAULT '{}',
  unresolved_issues text[] DEFAULT '{}',
  action_items text[] DEFAULT '{}',
  follow_up_needed boolean DEFAULT false,
  context_summary text,
  dominant_emotion text,
  session_quality_score integer CHECK (session_quality_score >= 1 AND session_quality_score <= 10),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.session_context_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own snapshots" ON public.session_context_snapshots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own snapshots" ON public.session_context_snapshots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own snapshots" ON public.session_context_snapshots FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own snapshots" ON public.session_context_snapshots FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Doctors can view patient snapshots" ON public.session_context_snapshots FOR SELECT USING (
  EXISTS (SELECT 1 FROM doctor_patient_access WHERE patient_id = session_context_snapshots.user_id AND doctor_id = auth.uid() AND is_active = true)
);

CREATE INDEX idx_session_snapshots_user ON public.session_context_snapshots(user_id);
CREATE INDEX idx_session_snapshots_session ON public.session_context_snapshots(session_id);
CREATE INDEX idx_session_snapshots_follow_up ON public.session_context_snapshots(user_id, follow_up_needed) WHERE follow_up_needed = true;

-- 3. EMOTION_PATTERNS - Pattern emozionali rilevati
CREATE TABLE public.emotion_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pattern_type text NOT NULL CHECK (pattern_type IN ('morning_dip', 'evening_low', 'weekend_boost', 'monday_blues', 'seasonal_sad', 'work_stress', 'social_boost', 'exercise_effect', 'sleep_correlation', 'custom')),
  description text NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  confidence numeric(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  data_points integer NOT NULL DEFAULT 0,
  trigger_factors text[] DEFAULT '{}',
  recommendations text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  last_validated_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.emotion_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own patterns" ON public.emotion_patterns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own patterns" ON public.emotion_patterns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own patterns" ON public.emotion_patterns FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own patterns" ON public.emotion_patterns FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Doctors can view patient patterns" ON public.emotion_patterns FOR SELECT USING (
  EXISTS (SELECT 1 FROM doctor_patient_access WHERE patient_id = emotion_patterns.user_id AND doctor_id = auth.uid() AND is_active = true)
);

CREATE INDEX idx_emotion_patterns_user ON public.emotion_patterns(user_id);
CREATE INDEX idx_emotion_patterns_type ON public.emotion_patterns(user_id, pattern_type);

-- 4. USER_CORRELATIONS - Correlazioni automatiche
CREATE TABLE public.user_correlations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  metric_a text NOT NULL,
  metric_b text NOT NULL,
  correlation_type text NOT NULL CHECK (correlation_type IN ('positive', 'negative', 'none', 'complex')),
  strength numeric(4,3) NOT NULL CHECK (strength >= -1 AND strength <= 1),
  sample_size integer NOT NULL DEFAULT 0,
  last_calculated_at timestamptz NOT NULL DEFAULT now(),
  insight_text text,
  is_significant boolean DEFAULT false,
  p_value numeric(5,4),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, metric_a, metric_b)
);

ALTER TABLE public.user_correlations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own correlations" ON public.user_correlations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own correlations" ON public.user_correlations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own correlations" ON public.user_correlations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own correlations" ON public.user_correlations FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Doctors can view patient correlations" ON public.user_correlations FOR SELECT USING (
  EXISTS (SELECT 1 FROM doctor_patient_access WHERE patient_id = user_correlations.user_id AND doctor_id = auth.uid() AND is_active = true)
);

CREATE INDEX idx_user_correlations_user ON public.user_correlations(user_id);
CREATE INDEX idx_user_correlations_significant ON public.user_correlations(user_id, is_significant) WHERE is_significant = true;

-- 5. HABIT_STREAKS - Cache degli streak
CREATE TABLE public.habit_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  habit_type text NOT NULL,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_completion_date date,
  streak_broken_count integer NOT NULL DEFAULT 0,
  total_completions integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, habit_type)
);

ALTER TABLE public.habit_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own streaks" ON public.habit_streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own streaks" ON public.habit_streaks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own streaks" ON public.habit_streaks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own streaks" ON public.habit_streaks FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Doctors can view patient streaks" ON public.habit_streaks FOR SELECT USING (
  EXISTS (SELECT 1 FROM doctor_patient_access WHERE patient_id = habit_streaks.user_id AND doctor_id = auth.uid() AND is_active = true)
);

CREATE INDEX idx_habit_streaks_user ON public.habit_streaks(user_id);

-- 6. SMART_NOTIFICATIONS - Notifiche intelligenti
CREATE TABLE public.smart_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  trigger_type text NOT NULL CHECK (trigger_type IN ('event_reminder', 'habit_check', 'mood_follow_up', 'streak_at_risk', 'streak_celebration', 'weekly_summary', 'correlation_insight', 'goal_progress')),
  scheduled_for timestamptz NOT NULL,
  content text NOT NULL,
  title text,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  source_id uuid,
  source_type text,
  sent_at timestamptz,
  read_at timestamptz,
  dismissed_at timestamptz,
  action_taken text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.smart_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON public.smart_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own notifications" ON public.smart_notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.smart_notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notifications" ON public.smart_notifications FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_smart_notifications_user_pending ON public.smart_notifications(user_id, scheduled_for) WHERE sent_at IS NULL;
CREATE INDEX idx_smart_notifications_scheduled ON public.smart_notifications(scheduled_for) WHERE sent_at IS NULL;

-- 7. CONVERSATION_TOPICS - Tracking argomenti
CREATE TABLE public.conversation_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  topic text NOT NULL,
  first_mentioned_at timestamptz NOT NULL DEFAULT now(),
  last_mentioned_at timestamptz NOT NULL DEFAULT now(),
  sentiment_avg numeric(3,2) CHECK (sentiment_avg >= -1 AND sentiment_avg <= 1),
  mention_count integer NOT NULL DEFAULT 1,
  is_sensitive boolean DEFAULT false,
  avoid_unless_introduced boolean DEFAULT false,
  related_topics text[] DEFAULT '{}',
  session_ids uuid[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, topic)
);

ALTER TABLE public.conversation_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own topics" ON public.conversation_topics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own topics" ON public.conversation_topics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own topics" ON public.conversation_topics FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own topics" ON public.conversation_topics FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Doctors can view patient topics" ON public.conversation_topics FOR SELECT USING (
  EXISTS (SELECT 1 FROM doctor_patient_access WHERE patient_id = conversation_topics.user_id AND doctor_id = auth.uid() AND is_active = true)
);

CREATE INDEX idx_conversation_topics_user ON public.conversation_topics(user_id);
CREATE INDEX idx_conversation_topics_sensitive ON public.conversation_topics(user_id, is_sensitive) WHERE is_sensitive = true;
CREATE INDEX idx_conversation_topics_recent ON public.conversation_topics(user_id, last_mentioned_at DESC);

-- 8. ARIA_RESPONSE_FEEDBACK - Quality tracking
CREATE TABLE public.aria_response_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  response_text text NOT NULL,
  user_reaction text CHECK (user_reaction IN ('continued', 'topic_changed', 'corrected', 'ignored', 'positive', 'negative', 'neutral')),
  explicit_feedback text,
  response_length integer,
  response_type text CHECK (response_type IN ('empathy', 'question', 'advice', 'celebration', 'validation', 'reflection', 'psychoeducation', 'grounding')),
  context_appropriateness integer CHECK (context_appropriateness >= 1 AND context_appropriateness <= 5),
  was_helpful boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.aria_response_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own feedback" ON public.aria_response_feedback FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own feedback" ON public.aria_response_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own feedback" ON public.aria_response_feedback FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX idx_aria_feedback_session ON public.aria_response_feedback(session_id);
CREATE INDEX idx_aria_feedback_user ON public.aria_response_feedback(user_id);
CREATE INDEX idx_aria_feedback_type ON public.aria_response_feedback(response_type);

-- 9. ADD recorded_at TO daily_emotions FOR GRANULAR TIMESTAMPS
ALTER TABLE public.daily_emotions 
ADD COLUMN IF NOT EXISTS recorded_at timestamptz DEFAULT now();

-- 10. UPDATE TRIGGER FOR user_correlations
CREATE OR REPLACE FUNCTION public.update_correlation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_user_correlations_timestamp
BEFORE UPDATE ON public.user_correlations
FOR EACH ROW EXECUTE FUNCTION public.update_correlation_timestamp();

-- 11. FUNCTION TO UPDATE HABIT STREAKS (called after daily_habits insert/update)
CREATE OR REPLACE FUNCTION public.update_habit_streak()
RETURNS TRIGGER AS $$
DECLARE
  v_last_date date;
  v_current_streak int;
  v_longest_streak int;
  v_broken_count int;
  v_total int;
BEGIN
  -- Get current streak data
  SELECT last_completion_date, current_streak, longest_streak, streak_broken_count, total_completions
  INTO v_last_date, v_current_streak, v_longest_streak, v_broken_count, v_total
  FROM public.habit_streaks
  WHERE user_id = NEW.user_id AND habit_type = NEW.habit_type;
  
  IF NOT FOUND THEN
    -- First entry for this habit
    INSERT INTO public.habit_streaks (user_id, habit_type, current_streak, longest_streak, last_completion_date, total_completions)
    VALUES (NEW.user_id, NEW.habit_type, 1, 1, NEW.date, 1);
  ELSE
    -- Calculate new streak
    IF NEW.date = v_last_date + 1 THEN
      -- Consecutive day
      v_current_streak := v_current_streak + 1;
      IF v_current_streak > v_longest_streak THEN
        v_longest_streak := v_current_streak;
      END IF;
    ELSIF NEW.date > v_last_date + 1 THEN
      -- Streak broken
      v_current_streak := 1;
      v_broken_count := v_broken_count + 1;
    ELSIF NEW.date = v_last_date THEN
      -- Same day, just update total
      NULL;
    END IF;
    
    UPDATE public.habit_streaks
    SET current_streak = v_current_streak,
        longest_streak = v_longest_streak,
        last_completion_date = GREATEST(v_last_date, NEW.date),
        streak_broken_count = v_broken_count,
        total_completions = v_total + 1,
        updated_at = now()
    WHERE user_id = NEW.user_id AND habit_type = NEW.habit_type;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_streak_on_habit_completion
AFTER INSERT ON public.daily_habits
FOR EACH ROW EXECUTE FUNCTION public.update_habit_streak();