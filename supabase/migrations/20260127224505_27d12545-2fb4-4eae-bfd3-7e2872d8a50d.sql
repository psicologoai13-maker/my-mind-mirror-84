-- =============================================
-- PHASE 1: Habit Tracking & Body Metrics Tables
-- =============================================

-- Table for daily habits tracking (water, cigarettes, exercise, meditation, etc.)
CREATE TABLE public.daily_habits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  habit_type TEXT NOT NULL, -- 'water', 'cigarettes', 'exercise', 'meditation', 'alcohol', 'caffeine', 'steps'
  value NUMERIC NOT NULL DEFAULT 0, -- Liters, count, minutes, steps, etc.
  unit TEXT, -- 'L', 'pieces', 'minutes', 'steps', 'drinks', 'cups'
  target_value NUMERIC, -- Daily goal (e.g., 8L water, 0 cigarettes)
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date, habit_type)
);

-- Table for body metrics (weight, measurements, etc.)
CREATE TABLE public.body_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight NUMERIC, -- in kg
  waist_circumference NUMERIC, -- in cm
  sleep_hours NUMERIC, -- actual hours slept
  resting_heart_rate INTEGER, -- bpm
  blood_pressure_systolic INTEGER,
  blood_pressure_diastolic INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Table for user achievements/badges
CREATE TABLE public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  achievement_id TEXT NOT NULL, -- 'first_checkin', 'week_streak', 'zen_master', etc.
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}', -- Extra data like streak count, total value, etc.
  UNIQUE(user_id, achievement_id)
);

-- Table to track user's active/configured habits
CREATE TABLE public.user_habits_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  habit_type TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  daily_target NUMERIC, -- User's personal daily goal
  unit TEXT,
  streak_type TEXT DEFAULT 'daily', -- 'daily' (do every day) or 'abstain' (days without)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, habit_type)
);

-- Enable RLS on all new tables
ALTER TABLE public.daily_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_habits_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for daily_habits
CREATE POLICY "Users can view their own habits" ON public.daily_habits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own habits" ON public.daily_habits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own habits" ON public.daily_habits
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own habits" ON public.daily_habits
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Doctors can view patient habits" ON public.daily_habits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM doctor_patient_access
      WHERE doctor_patient_access.patient_id = daily_habits.user_id
        AND doctor_patient_access.doctor_id = auth.uid()
        AND doctor_patient_access.is_active = true
    )
  );

-- RLS Policies for body_metrics
CREATE POLICY "Users can view their own body metrics" ON public.body_metrics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own body metrics" ON public.body_metrics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own body metrics" ON public.body_metrics
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own body metrics" ON public.body_metrics
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Doctors can view patient body metrics" ON public.body_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM doctor_patient_access
      WHERE doctor_patient_access.patient_id = body_metrics.user_id
        AND doctor_patient_access.doctor_id = auth.uid()
        AND doctor_patient_access.is_active = true
    )
  );

-- RLS Policies for user_achievements
CREATE POLICY "Users can view their own achievements" ON public.user_achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievements" ON public.user_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Doctors can view patient achievements" ON public.user_achievements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM doctor_patient_access
      WHERE doctor_patient_access.patient_id = user_achievements.user_id
        AND doctor_patient_access.doctor_id = auth.uid()
        AND doctor_patient_access.is_active = true
    )
  );

-- RLS Policies for user_habits_config
CREATE POLICY "Users can view their own habits config" ON public.user_habits_config
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own habits config" ON public.user_habits_config
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own habits config" ON public.user_habits_config
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own habits config" ON public.user_habits_config
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updating timestamps
CREATE TRIGGER update_daily_habits_timestamp
  BEFORE UPDATE ON public.daily_habits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_daily_tables_timestamp();

CREATE TRIGGER update_body_metrics_timestamp
  BEFORE UPDATE ON public.body_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_daily_tables_timestamp();

CREATE TRIGGER update_user_habits_config_timestamp
  BEFORE UPDATE ON public.user_habits_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_daily_tables_timestamp();

-- Trigger to update user_profiles.last_data_change_at when habits change
CREATE TRIGGER habits_update_user_data_change
  AFTER INSERT OR UPDATE ON public.daily_habits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_data_change_timestamp();

CREATE TRIGGER body_metrics_update_user_data_change
  AFTER INSERT OR UPDATE ON public.body_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_data_change_timestamp();