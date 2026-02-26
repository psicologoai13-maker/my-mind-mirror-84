SET session_replication_role = replica;

-- ============================================================
-- Migration: 20251224153218_8cc13810-c1a5-401f-912c-c20208098b24.sql
-- ============================================================
-- Create user profiles table
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  wellness_score INTEGER DEFAULT 0 CHECK (wellness_score >= 0 AND wellness_score <= 100),
  life_areas_scores JSONB DEFAULT '{"friendship": 0, "love": 0, "work": 0, "wellness": 0}'::jsonb
);

-- Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_profiles
CREATE POLICY "Users can view their own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Create daily check-ins table
CREATE TABLE public.daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  mood_emoji TEXT NOT NULL,
  mood_value INTEGER NOT NULL CHECK (mood_value >= 1 AND mood_value <= 5),
  notes TEXT
);

-- Enable RLS on daily_checkins
ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;

-- RLS policies for daily_checkins
CREATE POLICY "Users can view their own checkins"
  ON public.daily_checkins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own checkins"
  ON public.daily_checkins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own checkins"
  ON public.daily_checkins FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own checkins"
  ON public.daily_checkins FOR DELETE
  USING (auth.uid() = user_id);

-- Create sessions table for AI conversations
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_time TIMESTAMP WITH TIME ZONE,
  duration INTEGER, -- in seconds
  type TEXT NOT NULL CHECK (type IN ('voice', 'chat')) DEFAULT 'chat',
  transcript TEXT,
  ai_summary TEXT,
  mood_score_detected INTEGER CHECK (mood_score_detected >= 1 AND mood_score_detected <= 10),
  anxiety_score_detected INTEGER CHECK (anxiety_score_detected >= 1 AND anxiety_score_detected <= 10),
  emotion_tags TEXT[] DEFAULT '{}'::TEXT[],
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled'))
);

-- Enable RLS on sessions
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for sessions
CREATE POLICY "Users can view their own sessions"
  ON public.sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
  ON public.sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON public.sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
  ON public.sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email)
  );
  RETURN NEW;
END;
$$;

-- Trigger to auto-create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX idx_daily_checkins_user_date ON public.daily_checkins(user_id, created_at DESC);
CREATE INDEX idx_sessions_user_date ON public.sessions(user_id, start_time DESC);
CREATE INDEX idx_sessions_status ON public.sessions(status);
-- ============================================================
-- Migration: 20251224180810_e0937274-8142-4392-8c26-6db252b2a078.sql
-- ============================================================
-- Add long_term_memory column to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS long_term_memory text[] DEFAULT '{}'::text[];
-- ============================================================
-- Migration: 20251224182415_a5b31f81-65cb-4912-a987-ec62da74c223.sql
-- ============================================================
-- Add new columns for rich session analysis data
ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS life_balance_scores jsonb DEFAULT '{"love": null, "work": null, "friendship": null, "energy": null, "growth": null}'::jsonb,
ADD COLUMN IF NOT EXISTS emotion_breakdown jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS key_events text[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS insights text;

-- Update user_profiles life_areas_scores to include new categories
UPDATE public.user_profiles
SET life_areas_scores = jsonb_set(
  jsonb_set(life_areas_scores, '{energy}', 'null'::jsonb, true),
  '{growth}', 'null'::jsonb, true
)
WHERE life_areas_scores IS NOT NULL;
-- ============================================================
-- Migration: 20251226020847_edb75d7d-b777-49fc-b3e2-7b7c08cdccb6.sql
-- ============================================================
-- Create thematic_diaries table for persistent chat messages
CREATE TABLE public.thematic_diaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  theme TEXT NOT NULL CHECK (theme IN ('love', 'work', 'relationships', 'self')),
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_message_preview TEXT,
  last_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint for user-theme combination
CREATE UNIQUE INDEX idx_thematic_diaries_user_theme ON public.thematic_diaries(user_id, theme);

-- Enable Row Level Security
ALTER TABLE public.thematic_diaries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own diaries" 
ON public.thematic_diaries 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own diaries" 
ON public.thematic_diaries 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own diaries" 
ON public.thematic_diaries 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own diaries" 
ON public.thematic_diaries 
FOR DELETE 
USING (auth.uid() = user_id);
-- ============================================================
-- Migration: 20251226025526_30fb3a5c-dc4d-4b51-aad0-60464979407f.sql
-- ============================================================
-- Add crisis_alert column to sessions table
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS crisis_alert boolean DEFAULT false;

-- Create table for doctor sharing codes
CREATE TABLE public.doctor_share_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  code varchar(6) NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true
);

-- Enable Row Level Security
ALTER TABLE public.doctor_share_codes ENABLE ROW LEVEL SECURITY;

-- Create policies for doctor_share_codes
CREATE POLICY "Users can view their own share codes" 
ON public.doctor_share_codes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own share codes" 
ON public.doctor_share_codes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own share codes" 
ON public.doctor_share_codes 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own share codes" 
ON public.doctor_share_codes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster code lookups
CREATE INDEX idx_doctor_share_codes_code ON public.doctor_share_codes(code);
CREATE INDEX idx_doctor_share_codes_user ON public.doctor_share_codes(user_id);
-- ============================================================
-- Migration: 20251226030146_b3d188a8-0a60-4682-af44-29d099ca10d1.sql
-- ============================================================
-- Create shared_access table for doctor view tokens (more robust than doctor_share_codes)
CREATE TABLE IF NOT EXISTS public.shared_access (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  token varchar(32) NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  access_count integer NOT NULL DEFAULT 0,
  last_accessed_at timestamp with time zone
);

-- Enable Row Level Security
ALTER TABLE public.shared_access ENABLE ROW LEVEL SECURITY;

-- Create policies for shared_access (user can manage their own)
CREATE POLICY "Users can view their own access tokens" 
ON public.shared_access 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own access tokens" 
ON public.shared_access 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own access tokens" 
ON public.shared_access 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own access tokens" 
ON public.shared_access 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster token lookups
CREATE INDEX idx_shared_access_token ON public.shared_access(token);
CREATE INDEX idx_shared_access_user ON public.shared_access(user_id);
-- ============================================================
-- Migration: 20251226031723_f1e42f73-cc2b-401d-a1c3-60a1270a1efb.sql
-- ============================================================
-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('patient', 'doctor');

-- Create user_roles table (security best practice: roles in separate table)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'patient',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own role on signup"
ON public.user_roles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create doctor_patient_access table
CREATE TABLE public.doctor_patient_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  access_granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (doctor_id, patient_id)
);

-- Enable RLS
ALTER TABLE public.doctor_patient_access ENABLE ROW LEVEL SECURITY;

-- Doctors can view their patient connections
CREATE POLICY "Doctors can view their patient connections"
ON public.doctor_patient_access
FOR SELECT
USING (
  auth.uid() = doctor_id 
  AND public.has_role(auth.uid(), 'doctor')
);

-- Doctors can add patients
CREATE POLICY "Doctors can add patients"
ON public.doctor_patient_access
FOR INSERT
WITH CHECK (
  auth.uid() = doctor_id 
  AND public.has_role(auth.uid(), 'doctor')
);

-- Doctors can update their connections
CREATE POLICY "Doctors can update their connections"
ON public.doctor_patient_access
FOR UPDATE
USING (
  auth.uid() = doctor_id 
  AND public.has_role(auth.uid(), 'doctor')
);

-- Doctors can delete connections
CREATE POLICY "Doctors can delete their connections"
ON public.doctor_patient_access
FOR DELETE
USING (
  auth.uid() = doctor_id 
  AND public.has_role(auth.uid(), 'doctor')
);

-- Patients can view who has access to them
CREATE POLICY "Patients can view their doctor connections"
ON public.doctor_patient_access
FOR SELECT
USING (auth.uid() = patient_id);

-- Add connection_code to user_profiles for patient linking
ALTER TABLE public.user_profiles 
ADD COLUMN connection_code VARCHAR(8) UNIQUE;

-- Function to generate unique connection code
CREATE OR REPLACE FUNCTION public.generate_connection_code()
RETURNS VARCHAR(8)
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result VARCHAR(8) := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Update existing profiles with connection codes
UPDATE public.user_profiles 
SET connection_code = public.generate_connection_code()
WHERE connection_code IS NULL;

-- Trigger to auto-generate connection code on profile creation
CREATE OR REPLACE FUNCTION public.set_connection_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.connection_code IS NULL THEN
    NEW.connection_code := public.generate_connection_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_connection_code
BEFORE INSERT ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_connection_code();

-- Function to find patient by connection code (for doctor use)
CREATE OR REPLACE FUNCTION public.find_patient_by_code(_code VARCHAR)
RETURNS TABLE(user_id UUID, name TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT up.user_id, up.name
  FROM public.user_profiles up
  INNER JOIN public.user_roles ur ON up.user_id = ur.user_id
  WHERE up.connection_code = UPPER(_code)
    AND ur.role = 'patient'
$$;
-- ============================================================
-- Migration: 20251226031747_95f5ecd7-e1b7-4020-b8ba-aa123dec3f93.sql
-- ============================================================
-- Fix search_path for generate_connection_code function
CREATE OR REPLACE FUNCTION public.generate_connection_code()
RETURNS VARCHAR(8)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result VARCHAR(8) := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;
-- ============================================================
-- Migration: 20251226033502_2218135b-0c2d-4e1a-94ec-56d493a926b8.sql
-- ============================================================
-- 1. FIX: Doctors can view their assigned patients' sessions
CREATE POLICY "Doctors can view assigned patients sessions"
ON public.sessions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.doctor_patient_access
    WHERE doctor_patient_access.patient_id = sessions.user_id
      AND doctor_patient_access.doctor_id = auth.uid()
      AND doctor_patient_access.is_active = true
  )
);

-- 2. FIX: Doctors can view their assigned patients' daily checkins
CREATE POLICY "Doctors can view assigned patients checkins"
ON public.daily_checkins
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.doctor_patient_access
    WHERE doctor_patient_access.patient_id = daily_checkins.user_id
      AND doctor_patient_access.doctor_id = auth.uid()
      AND doctor_patient_access.is_active = true
  )
);

-- 3. FIX: Doctors can view their assigned patients' profiles
CREATE POLICY "Doctors can view assigned patients profiles"
ON public.user_profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.doctor_patient_access
    WHERE doctor_patient_access.patient_id = user_profiles.user_id
      AND doctor_patient_access.doctor_id = auth.uid()
      AND doctor_patient_access.is_active = true
  )
);

-- 4. FIX: Patients can revoke doctor access (delete their own connections)
CREATE POLICY "Patients can revoke doctor access"
ON public.doctor_patient_access
FOR DELETE
USING (auth.uid() = patient_id);
-- ============================================================
-- Migration: 20251226184046_b36f37f1-3c48-4f6f-9e86-06d9ebba1f06.sql
-- ============================================================
-- Drop and recreate the function to handle users without explicit role
CREATE OR REPLACE FUNCTION public.find_patient_by_code(_code character varying)
RETURNS TABLE(user_id uuid, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT up.user_id, up.name
  FROM public.user_profiles up
  LEFT JOIN public.user_roles ur ON up.user_id = ur.user_id
  WHERE up.connection_code = UPPER(_code)
    AND (ur.role = 'patient' OR ur.role IS NULL)  -- Include users without role (default to patient)
$$;
-- ============================================================
-- Migration: 20251226204055_35c1030d-3bf4-4ba7-adad-371a140a3213.sql
-- ============================================================
-- Add new clinical analysis fields to sessions table
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS clinical_indices JSONB DEFAULT '{"rumination": null, "emotional_openness": null, "perceived_stress": null}'::jsonb,
ADD COLUMN IF NOT EXISTS sleep_quality INTEGER CHECK (sleep_quality IS NULL OR (sleep_quality >= 1 AND sleep_quality <= 10)),
ADD COLUMN IF NOT EXISTS specific_emotions JSONB DEFAULT '{"joy": 0, "sadness": 0, "anger": 0, "fear": 0, "apathy": 0}'::jsonb;

-- Comment on columns for documentation
COMMENT ON COLUMN public.sessions.clinical_indices IS 'Clinical indices (1-10): rumination, emotional_openness, perceived_stress';
COMMENT ON COLUMN public.sessions.sleep_quality IS 'Sleep quality score (1-10) inferred from conversation text';
COMMENT ON COLUMN public.sessions.specific_emotions IS 'Specific emotions breakdown in percentages: joy, sadness, anger, fear, apathy';
-- ============================================================
-- Migration: 20251229000714_da72cdfe-16ff-4bb7-bc03-81afcc606c88.sql
-- ============================================================
-- Add active_dashboard_metrics column to user_profiles for personalized dashboard
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS active_dashboard_metrics text[] DEFAULT ARRAY['mood', 'anxiety', 'energy', 'sleep'];
-- ============================================================
-- Migration: 20251229170401_367afcb7-2845-43bb-8603-79a9fc3cf613.sql
-- ============================================================
-- Add onboarding fields to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_answers jsonb DEFAULT '{}'::jsonb;
-- ============================================================
-- Migration: 20260102165610_54cc00db-ea77-4bfb-ab2c-aef4764ce9cf.sql
-- ============================================================
-- Add selected_goals column to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN selected_goals text[] DEFAULT '{}'::text[];
-- ============================================================
-- Migration: 20260121224913_baab57fd-bbcd-429a-a9f6-03009f7d528f.sql
-- ============================================================
-- Create RPC function to get aggregated daily metrics
-- This is the SINGLE SOURCE OF TRUTH for all frontend components

CREATE OR REPLACE FUNCTION public.get_daily_metrics(
  p_user_id uuid,
  p_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
  v_checkin_data jsonb;
  v_session_data jsonb;
  v_final_mood numeric;
  v_final_anxiety numeric;
  v_final_energy numeric;
  v_final_sleep numeric;
  v_final_joy numeric;
  v_final_sadness numeric;
  v_final_anger numeric;
  v_final_fear numeric;
  v_final_apathy numeric;
  v_checkin_age_hours numeric;
  v_use_checkin_priority boolean := false;
BEGIN
  -- 1. Get today's checkin data (if exists)
  SELECT jsonb_build_object(
    'mood_value', dc.mood_value,
    'notes', dc.notes,
    'created_at', dc.created_at,
    'age_hours', EXTRACT(EPOCH FROM (now() - dc.created_at)) / 3600
  )
  INTO v_checkin_data
  FROM daily_checkins dc
  WHERE dc.user_id = p_user_id
    AND DATE(dc.created_at) = p_date
  ORDER BY dc.created_at DESC
  LIMIT 1;

  -- Check if checkin is recent (within 2 hours) - give it priority
  IF v_checkin_data IS NOT NULL THEN
    v_checkin_age_hours := (v_checkin_data->>'age_hours')::numeric;
    v_use_checkin_priority := (v_checkin_age_hours < 2);
  END IF;

  -- 2. Get session data averages for the day
  SELECT jsonb_build_object(
    'avg_mood', AVG(s.mood_score_detected),
    'avg_anxiety', AVG(s.anxiety_score_detected),
    'avg_sleep', AVG(s.sleep_quality),
    'avg_joy', AVG((s.specific_emotions->>'joy')::numeric),
    'avg_sadness', AVG((s.specific_emotions->>'sadness')::numeric),
    'avg_anger', AVG((s.specific_emotions->>'anger')::numeric),
    'avg_fear', AVG((s.specific_emotions->>'fear')::numeric),
    'avg_apathy', AVG((s.specific_emotions->>'apathy')::numeric),
    'session_count', COUNT(*)
  )
  INTO v_session_data
  FROM sessions s
  WHERE s.user_id = p_user_id
    AND DATE(s.start_time) = p_date
    AND s.status = 'completed';

  -- 3. Calculate final values with priority rules
  
  -- MOOD: Checkin (1-5 scale -> 1-10) or Session (1-10)
  IF v_checkin_data IS NOT NULL THEN
    -- Convert 1-5 to 1-10 scale
    v_final_mood := ((v_checkin_data->>'mood_value')::numeric / 5) * 10;
  ELSIF v_session_data->>'avg_mood' IS NOT NULL THEN
    v_final_mood := (v_session_data->>'avg_mood')::numeric;
  ELSE
    v_final_mood := NULL;
  END IF;

  -- ANXIETY, ENERGY, SLEEP: From checkin notes (JSON) or sessions
  IF v_checkin_data IS NOT NULL AND v_checkin_data->>'notes' IS NOT NULL THEN
    BEGIN
      -- Parse notes JSON for anxiety, energy, sleep
      DECLARE
        v_notes jsonb;
      BEGIN
        v_notes := (v_checkin_data->>'notes')::jsonb;
        
        -- These are stored as 1-10 in notes
        IF v_notes->>'anxiety' IS NOT NULL THEN
          v_final_anxiety := (v_notes->>'anxiety')::numeric;
        END IF;
        IF v_notes->>'energy' IS NOT NULL THEN
          v_final_energy := (v_notes->>'energy')::numeric;
        END IF;
        IF v_notes->>'sleep' IS NOT NULL THEN
          v_final_sleep := (v_notes->>'sleep')::numeric;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        -- Notes not valid JSON, ignore
        NULL;
      END;
    END;
  END IF;

  -- Fill from sessions if not set from checkin
  IF v_final_anxiety IS NULL AND v_session_data->>'avg_anxiety' IS NOT NULL THEN
    v_final_anxiety := (v_session_data->>'avg_anxiety')::numeric;
  END IF;
  
  IF v_final_sleep IS NULL AND v_session_data->>'avg_sleep' IS NOT NULL THEN
    v_final_sleep := (v_session_data->>'avg_sleep')::numeric;
  END IF;

  -- Energy: derive from mood and anxiety if not directly available
  IF v_final_energy IS NULL AND v_final_mood IS NOT NULL THEN
    v_final_energy := GREATEST(1, LEAST(10, v_final_mood - COALESCE(v_final_anxiety, 5) * 0.3 + 2));
  END IF;

  -- EMOTIONS: From sessions only (AI-analyzed)
  IF v_session_data->>'avg_joy' IS NOT NULL THEN
    v_final_joy := (v_session_data->>'avg_joy')::numeric;
    v_final_sadness := (v_session_data->>'avg_sadness')::numeric;
    v_final_anger := (v_session_data->>'avg_anger')::numeric;
    v_final_fear := (v_session_data->>'avg_fear')::numeric;
    v_final_apathy := (v_session_data->>'avg_apathy')::numeric;
  END IF;

  -- 4. Build final result
  v_result := jsonb_build_object(
    'date', p_date,
    'vitals', jsonb_build_object(
      'mood', ROUND(COALESCE(v_final_mood, 0)::numeric, 1),
      'anxiety', ROUND(COALESCE(v_final_anxiety, 0)::numeric, 1),
      'energy', ROUND(COALESCE(v_final_energy, 0)::numeric, 1),
      'sleep', ROUND(COALESCE(v_final_sleep, 0)::numeric, 1)
    ),
    'emotions', jsonb_build_object(
      'joy', ROUND(COALESCE(v_final_joy, 0)::numeric, 0),
      'sadness', ROUND(COALESCE(v_final_sadness, 0)::numeric, 0),
      'anger', ROUND(COALESCE(v_final_anger, 0)::numeric, 0),
      'fear', ROUND(COALESCE(v_final_fear, 0)::numeric, 0),
      'apathy', ROUND(COALESCE(v_final_apathy, 0)::numeric, 0)
    ),
    'has_checkin', v_checkin_data IS NOT NULL,
    'has_sessions', (v_session_data->>'session_count')::int > 0,
    'checkin_priority', v_use_checkin_priority
  );

  RETURN v_result;
END;
$$;
-- ============================================================
-- Migration: 20260122202425_52e1083b-835b-4138-bd27-673c427ce33a.sql
-- ============================================================
-- 1. Daily Emotions Table - Stores specific emotion readings per day
CREATE TABLE IF NOT EXISTS public.daily_emotions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  joy INTEGER CHECK (joy >= 0 AND joy <= 10),
  sadness INTEGER CHECK (sadness >= 0 AND sadness <= 10),
  anger INTEGER CHECK (anger >= 0 AND anger <= 10),
  fear INTEGER CHECK (fear >= 0 AND fear <= 10),
  apathy INTEGER CHECK (apathy >= 0 AND apathy <= 10),
  source TEXT NOT NULL DEFAULT 'session', -- 'session', 'checkin', 'diary'
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date, source)
);

-- 2. Daily Life Areas Table - Stores life balance scores per day  
CREATE TABLE IF NOT EXISTS public.daily_life_areas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  work INTEGER CHECK (work >= 1 AND work <= 10),
  love INTEGER CHECK (love >= 1 AND love <= 10),
  health INTEGER CHECK (health >= 1 AND health <= 10),
  social INTEGER CHECK (social >= 1 AND social <= 10),
  growth INTEGER CHECK (growth >= 1 AND growth <= 10),
  source TEXT NOT NULL DEFAULT 'session', -- 'session', 'diary', 'manual'
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date, source)
);

-- 3. Enable RLS on both tables
ALTER TABLE public.daily_emotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_life_areas ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for daily_emotions
CREATE POLICY "Users can view their own emotions" ON public.daily_emotions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own emotions" ON public.daily_emotions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own emotions" ON public.daily_emotions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own emotions" ON public.daily_emotions
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Doctors can view patient emotions" ON public.daily_emotions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM doctor_patient_access 
    WHERE patient_id = daily_emotions.user_id 
    AND doctor_id = auth.uid() 
    AND is_active = true
  ));

-- 5. RLS Policies for daily_life_areas
CREATE POLICY "Users can view their own life areas" ON public.daily_life_areas
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own life areas" ON public.daily_life_areas
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own life areas" ON public.daily_life_areas
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own life areas" ON public.daily_life_areas
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Doctors can view patient life areas" ON public.daily_life_areas
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM doctor_patient_access 
    WHERE patient_id = daily_life_areas.user_id 
    AND doctor_id = auth.uid() 
    AND is_active = true
  ));

-- 6. Helper trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_daily_tables_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_daily_emotions_timestamp
  BEFORE UPDATE ON public.daily_emotions
  FOR EACH ROW EXECUTE FUNCTION public.update_daily_tables_timestamp();

CREATE TRIGGER update_daily_life_areas_timestamp
  BEFORE UPDATE ON public.daily_life_areas
  FOR EACH ROW EXECUTE FUNCTION public.update_daily_tables_timestamp();
-- ============================================================
-- Migration: 20260123103130_28b9fd24-7dd6-4542-9144-9278448fb31b.sql
-- ============================================================
-- Create chat_messages table for real-time message persistence
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for fast queries
CREATE INDEX idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at);

-- Enable Row Level Security
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own messages" 
ON public.chat_messages 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own messages" 
ON public.chat_messages 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages" 
ON public.chat_messages 
FOR DELETE 
USING (auth.uid() = user_id);

-- Doctors can view patient messages
CREATE POLICY "Doctors can view patient messages" 
ON public.chat_messages 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM doctor_patient_access
  WHERE doctor_patient_access.patient_id = chat_messages.user_id
    AND doctor_patient_access.doctor_id = auth.uid()
    AND doctor_patient_access.is_active = true
));
-- ============================================================
-- Migration: 20260123104411_356fe69e-fbfb-43d8-b543-d0c9c1597246.sql
-- ============================================================
-- Add dashboard_config JSONB column for personalized dashboard configuration
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS dashboard_config JSONB DEFAULT '{
  "priority_metrics": ["mood", "anxiety", "energy", "sleep"],
  "secondary_metrics": [],
  "hidden_metrics": [],
  "theme": "default"
}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.user_profiles.dashboard_config IS 'Personalized dashboard configuration based on onboarding answers. Contains priority_metrics, secondary_metrics, hidden_metrics arrays.';
-- ============================================================
-- Migration: 20260123135903_6fec2c9a-5950-42fe-8db2-c24377587cec.sql
-- ============================================================
-- Aggiorna la funzione get_daily_metrics per includere life_areas
-- Questa diventa la SINGOLA FONTE DI VERITÀ per tutti i dati

CREATE OR REPLACE FUNCTION public.get_daily_metrics(p_user_id uuid, p_date date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
  v_checkin_data jsonb;
  v_session_data jsonb;
  v_emotions_data jsonb;
  v_life_areas_data jsonb;
  v_final_mood numeric;
  v_final_anxiety numeric;
  v_final_energy numeric;
  v_final_sleep numeric;
  v_final_joy numeric;
  v_final_sadness numeric;
  v_final_anger numeric;
  v_final_fear numeric;
  v_final_apathy numeric;
  v_final_love numeric;
  v_final_work numeric;
  v_final_health numeric;
  v_final_social numeric;
  v_final_growth numeric;
  v_checkin_age_hours numeric;
  v_use_checkin_priority boolean := false;
BEGIN
  -- 1. Get today's checkin data (if exists)
  SELECT jsonb_build_object(
    'mood_value', dc.mood_value,
    'notes', dc.notes,
    'created_at', dc.created_at,
    'age_hours', EXTRACT(EPOCH FROM (now() - dc.created_at)) / 3600
  )
  INTO v_checkin_data
  FROM daily_checkins dc
  WHERE dc.user_id = p_user_id
    AND DATE(dc.created_at) = p_date
  ORDER BY dc.created_at DESC
  LIMIT 1;

  -- Check if checkin is recent (within 2 hours) - give it priority
  IF v_checkin_data IS NOT NULL THEN
    v_checkin_age_hours := (v_checkin_data->>'age_hours')::numeric;
    v_use_checkin_priority := (v_checkin_age_hours < 2);
  END IF;

  -- 2. Get session data averages for the day
  SELECT jsonb_build_object(
    'avg_mood', AVG(s.mood_score_detected),
    'avg_anxiety', AVG(s.anxiety_score_detected),
    'avg_sleep', AVG(s.sleep_quality),
    'session_count', COUNT(*)
  )
  INTO v_session_data
  FROM sessions s
  WHERE s.user_id = p_user_id
    AND DATE(s.start_time) = p_date
    AND s.status = 'completed';

  -- 3. Get emotions from daily_emotions table
  SELECT jsonb_build_object(
    'joy', COALESCE(de.joy, 0),
    'sadness', COALESCE(de.sadness, 0),
    'anger', COALESCE(de.anger, 0),
    'fear', COALESCE(de.fear, 0),
    'apathy', COALESCE(de.apathy, 0)
  )
  INTO v_emotions_data
  FROM daily_emotions de
  WHERE de.user_id = p_user_id
    AND de.date = p_date
  ORDER BY de.updated_at DESC
  LIMIT 1;

  -- 4. Get life areas from daily_life_areas table
  SELECT jsonb_build_object(
    'love', dla.love,
    'work', dla.work,
    'health', dla.health,
    'social', dla.social,
    'growth', dla.growth
  )
  INTO v_life_areas_data
  FROM daily_life_areas dla
  WHERE dla.user_id = p_user_id
    AND dla.date = p_date
  ORDER BY dla.updated_at DESC
  LIMIT 1;

  -- 5. Calculate final vitals with priority rules
  
  -- MOOD: Checkin (1-5 scale -> 1-10) or Session (1-10)
  IF v_checkin_data IS NOT NULL THEN
    v_final_mood := ((v_checkin_data->>'mood_value')::numeric / 5) * 10;
  ELSIF v_session_data->>'avg_mood' IS NOT NULL THEN
    v_final_mood := (v_session_data->>'avg_mood')::numeric;
  ELSE
    v_final_mood := NULL;
  END IF;

  -- ANXIETY, ENERGY, SLEEP: From checkin notes (JSON) or sessions
  IF v_checkin_data IS NOT NULL AND v_checkin_data->>'notes' IS NOT NULL THEN
    BEGIN
      DECLARE
        v_notes jsonb;
      BEGIN
        v_notes := (v_checkin_data->>'notes')::jsonb;
        
        IF v_notes->>'anxiety' IS NOT NULL THEN
          v_final_anxiety := (v_notes->>'anxiety')::numeric;
        END IF;
        IF v_notes->>'energy' IS NOT NULL THEN
          v_final_energy := (v_notes->>'energy')::numeric;
        END IF;
        IF v_notes->>'sleep' IS NOT NULL THEN
          v_final_sleep := (v_notes->>'sleep')::numeric;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END;
  END IF;

  -- Fill from sessions if not set from checkin
  IF v_final_anxiety IS NULL AND v_session_data->>'avg_anxiety' IS NOT NULL THEN
    v_final_anxiety := (v_session_data->>'avg_anxiety')::numeric;
  END IF;
  
  IF v_final_sleep IS NULL AND v_session_data->>'avg_sleep' IS NOT NULL THEN
    v_final_sleep := (v_session_data->>'avg_sleep')::numeric;
  END IF;

  -- Energy: derive from mood and anxiety if not directly available
  IF v_final_energy IS NULL AND v_final_mood IS NOT NULL THEN
    v_final_energy := GREATEST(1, LEAST(10, v_final_mood - COALESCE(v_final_anxiety, 5) * 0.3 + 2));
  END IF;

  -- 6. Extract emotions (from daily_emotions table)
  IF v_emotions_data IS NOT NULL THEN
    v_final_joy := COALESCE((v_emotions_data->>'joy')::numeric, 0);
    v_final_sadness := COALESCE((v_emotions_data->>'sadness')::numeric, 0);
    v_final_anger := COALESCE((v_emotions_data->>'anger')::numeric, 0);
    v_final_fear := COALESCE((v_emotions_data->>'fear')::numeric, 0);
    v_final_apathy := COALESCE((v_emotions_data->>'apathy')::numeric, 0);
  ELSE
    v_final_joy := 0;
    v_final_sadness := 0;
    v_final_anger := 0;
    v_final_fear := 0;
    v_final_apathy := 0;
  END IF;

  -- 7. Extract life areas (from daily_life_areas table)
  IF v_life_areas_data IS NOT NULL THEN
    v_final_love := (v_life_areas_data->>'love')::numeric;
    v_final_work := (v_life_areas_data->>'work')::numeric;
    v_final_health := (v_life_areas_data->>'health')::numeric;
    v_final_social := (v_life_areas_data->>'social')::numeric;
    v_final_growth := (v_life_areas_data->>'growth')::numeric;
  END IF;

  -- 8. Build final result with ALL data unified
  v_result := jsonb_build_object(
    'date', p_date,
    'vitals', jsonb_build_object(
      'mood', ROUND(COALESCE(v_final_mood, 0)::numeric, 1),
      'anxiety', ROUND(COALESCE(v_final_anxiety, 0)::numeric, 1),
      'energy', ROUND(COALESCE(v_final_energy, 0)::numeric, 1),
      'sleep', ROUND(COALESCE(v_final_sleep, 0)::numeric, 1)
    ),
    'emotions', jsonb_build_object(
      'joy', ROUND(v_final_joy::numeric, 0),
      'sadness', ROUND(v_final_sadness::numeric, 0),
      'anger', ROUND(v_final_anger::numeric, 0),
      'fear', ROUND(v_final_fear::numeric, 0),
      'apathy', ROUND(v_final_apathy::numeric, 0)
    ),
    'life_areas', jsonb_build_object(
      'love', v_final_love,
      'work', v_final_work,
      'health', v_final_health,
      'social', v_final_social,
      'growth', v_final_growth
    ),
    'has_checkin', v_checkin_data IS NOT NULL,
    'has_sessions', (v_session_data->>'session_count')::int > 0,
    'has_emotions', v_emotions_data IS NOT NULL,
    'has_life_areas', v_life_areas_data IS NOT NULL,
    'checkin_priority', v_use_checkin_priority
  );

  RETURN v_result;
END;
$function$;
-- ============================================================
-- Migration: 20260125170445_e26552bd-1a57-4faa-b2f2-75ddd6d05f55.sql
-- ============================================================
-- Create table for deep psychology metrics (storicized)
CREATE TABLE public.daily_psychology (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Cognitive metrics (1-10 scale, null if not detected)
  rumination INTEGER CHECK (rumination IS NULL OR (rumination >= 1 AND rumination <= 10)),
  self_efficacy INTEGER CHECK (self_efficacy IS NULL OR (self_efficacy >= 1 AND self_efficacy <= 10)),
  mental_clarity INTEGER CHECK (mental_clarity IS NULL OR (mental_clarity >= 1 AND mental_clarity <= 10)),
  
  -- Stress & Coping metrics
  burnout_level INTEGER CHECK (burnout_level IS NULL OR (burnout_level >= 1 AND burnout_level <= 10)),
  coping_ability INTEGER CHECK (coping_ability IS NULL OR (coping_ability >= 1 AND coping_ability <= 10)),
  loneliness_perceived INTEGER CHECK (loneliness_perceived IS NULL OR (loneliness_perceived >= 1 AND loneliness_perceived <= 10)),
  
  -- Physiological metrics
  somatic_tension INTEGER CHECK (somatic_tension IS NULL OR (somatic_tension >= 1 AND somatic_tension <= 10)),
  appetite_changes INTEGER CHECK (appetite_changes IS NULL OR (appetite_changes >= 1 AND appetite_changes <= 10)),
  sunlight_exposure INTEGER CHECK (sunlight_exposure IS NULL OR (sunlight_exposure >= 1 AND sunlight_exposure <= 10)),
  
  -- Complex emotional metrics
  guilt INTEGER CHECK (guilt IS NULL OR (guilt >= 1 AND guilt <= 10)),
  gratitude INTEGER CHECK (gratitude IS NULL OR (gratitude >= 1 AND gratitude <= 10)),
  irritability INTEGER CHECK (irritability IS NULL OR (irritability >= 1 AND irritability <= 10)),
  
  -- Metadata
  session_id UUID REFERENCES sessions(id),
  source TEXT NOT NULL DEFAULT 'session',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Unique constraint for upsert
  UNIQUE(user_id, date, source)
);

-- Enable RLS
ALTER TABLE public.daily_psychology ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own psychology data" 
  ON public.daily_psychology FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own psychology data" 
  ON public.daily_psychology FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own psychology data" 
  ON public.daily_psychology FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own psychology data" 
  ON public.daily_psychology FOR DELETE 
  USING (auth.uid() = user_id);

-- Doctor access policy
CREATE POLICY "Doctors can view patient psychology data" 
  ON public.daily_psychology FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM doctor_patient_access 
      WHERE doctor_patient_access.patient_id = daily_psychology.user_id 
      AND doctor_patient_access.doctor_id = auth.uid() 
      AND doctor_patient_access.is_active = true
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_daily_psychology_timestamp
  BEFORE UPDATE ON public.daily_psychology
  FOR EACH ROW
  EXECUTE FUNCTION public.update_daily_tables_timestamp();

-- Add index for faster queries
CREATE INDEX idx_daily_psychology_user_date ON public.daily_psychology(user_id, date DESC);

-- Add deep_psychology JSONB column to sessions for full history
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS deep_psychology JSONB DEFAULT '{}'::jsonb;
-- ============================================================
-- Migration: 20260125170726_b7b7db01-8482-4b88-bfb4-591e625eb98f.sql
-- ============================================================
-- Update get_daily_metrics RPC to include deep_psychology data
CREATE OR REPLACE FUNCTION public.get_daily_metrics(p_user_id uuid, p_date date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
  v_checkin_data jsonb;
  v_session_data jsonb;
  v_emotions_data jsonb;
  v_life_areas_data jsonb;
  v_psychology_data jsonb;
  v_final_mood numeric;
  v_final_anxiety numeric;
  v_final_energy numeric;
  v_final_sleep numeric;
  v_final_joy numeric;
  v_final_sadness numeric;
  v_final_anger numeric;
  v_final_fear numeric;
  v_final_apathy numeric;
  v_final_love numeric;
  v_final_work numeric;
  v_final_health numeric;
  v_final_social numeric;
  v_final_growth numeric;
  v_checkin_age_hours numeric;
  v_use_checkin_priority boolean := false;
BEGIN
  -- 1. Get today's checkin data (if exists)
  SELECT jsonb_build_object(
    'mood_value', dc.mood_value,
    'notes', dc.notes,
    'created_at', dc.created_at,
    'age_hours', EXTRACT(EPOCH FROM (now() - dc.created_at)) / 3600
  )
  INTO v_checkin_data
  FROM daily_checkins dc
  WHERE dc.user_id = p_user_id
    AND DATE(dc.created_at) = p_date
  ORDER BY dc.created_at DESC
  LIMIT 1;

  -- Check if checkin is recent (within 2 hours) - give it priority
  IF v_checkin_data IS NOT NULL THEN
    v_checkin_age_hours := (v_checkin_data->>'age_hours')::numeric;
    v_use_checkin_priority := (v_checkin_age_hours < 2);
  END IF;

  -- 2. Get session data averages for the day
  SELECT jsonb_build_object(
    'avg_mood', AVG(s.mood_score_detected),
    'avg_anxiety', AVG(s.anxiety_score_detected),
    'avg_sleep', AVG(s.sleep_quality),
    'session_count', COUNT(*)
  )
  INTO v_session_data
  FROM sessions s
  WHERE s.user_id = p_user_id
    AND DATE(s.start_time) = p_date
    AND s.status = 'completed';

  -- 3. Get emotions from daily_emotions table
  SELECT jsonb_build_object(
    'joy', COALESCE(de.joy, 0),
    'sadness', COALESCE(de.sadness, 0),
    'anger', COALESCE(de.anger, 0),
    'fear', COALESCE(de.fear, 0),
    'apathy', COALESCE(de.apathy, 0)
  )
  INTO v_emotions_data
  FROM daily_emotions de
  WHERE de.user_id = p_user_id
    AND de.date = p_date
  ORDER BY de.updated_at DESC
  LIMIT 1;

  -- 4. Get life areas from daily_life_areas table
  SELECT jsonb_build_object(
    'love', dla.love,
    'work', dla.work,
    'health', dla.health,
    'social', dla.social,
    'growth', dla.growth
  )
  INTO v_life_areas_data
  FROM daily_life_areas dla
  WHERE dla.user_id = p_user_id
    AND dla.date = p_date
  ORDER BY dla.updated_at DESC
  LIMIT 1;

  -- 5. NEW: Get deep psychology from daily_psychology table
  SELECT jsonb_build_object(
    'rumination', dp.rumination,
    'self_efficacy', dp.self_efficacy,
    'mental_clarity', dp.mental_clarity,
    'burnout_level', dp.burnout_level,
    'coping_ability', dp.coping_ability,
    'loneliness_perceived', dp.loneliness_perceived,
    'somatic_tension', dp.somatic_tension,
    'appetite_changes', dp.appetite_changes,
    'sunlight_exposure', dp.sunlight_exposure,
    'guilt', dp.guilt,
    'gratitude', dp.gratitude,
    'irritability', dp.irritability
  )
  INTO v_psychology_data
  FROM daily_psychology dp
  WHERE dp.user_id = p_user_id
    AND dp.date = p_date
  ORDER BY dp.updated_at DESC
  LIMIT 1;

  -- 6. Calculate final vitals with priority rules
  
  -- MOOD: Checkin (1-5 scale -> 1-10) or Session (1-10)
  IF v_checkin_data IS NOT NULL THEN
    v_final_mood := ((v_checkin_data->>'mood_value')::numeric / 5) * 10;
  ELSIF v_session_data->>'avg_mood' IS NOT NULL THEN
    v_final_mood := (v_session_data->>'avg_mood')::numeric;
  ELSE
    v_final_mood := NULL;
  END IF;

  -- ANXIETY, ENERGY, SLEEP: From checkin notes (JSON) or sessions
  IF v_checkin_data IS NOT NULL AND v_checkin_data->>'notes' IS NOT NULL THEN
    BEGIN
      DECLARE
        v_notes jsonb;
      BEGIN
        v_notes := (v_checkin_data->>'notes')::jsonb;
        
        IF v_notes->>'anxiety' IS NOT NULL THEN
          v_final_anxiety := (v_notes->>'anxiety')::numeric;
        END IF;
        IF v_notes->>'energy' IS NOT NULL THEN
          v_final_energy := (v_notes->>'energy')::numeric;
        END IF;
        IF v_notes->>'sleep' IS NOT NULL THEN
          v_final_sleep := (v_notes->>'sleep')::numeric;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END;
  END IF;

  -- Fill from sessions if not set from checkin
  IF v_final_anxiety IS NULL AND v_session_data->>'avg_anxiety' IS NOT NULL THEN
    v_final_anxiety := (v_session_data->>'avg_anxiety')::numeric;
  END IF;
  
  IF v_final_sleep IS NULL AND v_session_data->>'avg_sleep' IS NOT NULL THEN
    v_final_sleep := (v_session_data->>'avg_sleep')::numeric;
  END IF;

  -- Energy: derive from mood and anxiety if not directly available
  IF v_final_energy IS NULL AND v_final_mood IS NOT NULL THEN
    v_final_energy := GREATEST(1, LEAST(10, v_final_mood - COALESCE(v_final_anxiety, 5) * 0.3 + 2));
  END IF;

  -- 7. Extract emotions (from daily_emotions table)
  IF v_emotions_data IS NOT NULL THEN
    v_final_joy := COALESCE((v_emotions_data->>'joy')::numeric, 0);
    v_final_sadness := COALESCE((v_emotions_data->>'sadness')::numeric, 0);
    v_final_anger := COALESCE((v_emotions_data->>'anger')::numeric, 0);
    v_final_fear := COALESCE((v_emotions_data->>'fear')::numeric, 0);
    v_final_apathy := COALESCE((v_emotions_data->>'apathy')::numeric, 0);
  ELSE
    v_final_joy := 0;
    v_final_sadness := 0;
    v_final_anger := 0;
    v_final_fear := 0;
    v_final_apathy := 0;
  END IF;

  -- 8. Extract life areas (from daily_life_areas table)
  IF v_life_areas_data IS NOT NULL THEN
    v_final_love := (v_life_areas_data->>'love')::numeric;
    v_final_work := (v_life_areas_data->>'work')::numeric;
    v_final_health := (v_life_areas_data->>'health')::numeric;
    v_final_social := (v_life_areas_data->>'social')::numeric;
    v_final_growth := (v_life_areas_data->>'growth')::numeric;
  END IF;

  -- 9. Build final result with ALL data unified (including deep_psychology)
  v_result := jsonb_build_object(
    'date', p_date,
    'vitals', jsonb_build_object(
      'mood', ROUND(COALESCE(v_final_mood, 0)::numeric, 1),
      'anxiety', ROUND(COALESCE(v_final_anxiety, 0)::numeric, 1),
      'energy', ROUND(COALESCE(v_final_energy, 0)::numeric, 1),
      'sleep', ROUND(COALESCE(v_final_sleep, 0)::numeric, 1)
    ),
    'emotions', jsonb_build_object(
      'joy', ROUND(v_final_joy::numeric, 0),
      'sadness', ROUND(v_final_sadness::numeric, 0),
      'anger', ROUND(v_final_anger::numeric, 0),
      'fear', ROUND(v_final_fear::numeric, 0),
      'apathy', ROUND(v_final_apathy::numeric, 0)
    ),
    'life_areas', jsonb_build_object(
      'love', v_final_love,
      'work', v_final_work,
      'health', v_final_health,
      'social', v_final_social,
      'growth', v_final_growth
    ),
    'deep_psychology', COALESCE(v_psychology_data, jsonb_build_object(
      'rumination', null,
      'self_efficacy', null,
      'mental_clarity', null,
      'burnout_level', null,
      'coping_ability', null,
      'loneliness_perceived', null,
      'somatic_tension', null,
      'appetite_changes', null,
      'sunlight_exposure', null,
      'guilt', null,
      'gratitude', null,
      'irritability', null
    )),
    'has_checkin', v_checkin_data IS NOT NULL,
    'has_sessions', (v_session_data->>'session_count')::int > 0,
    'has_emotions', v_emotions_data IS NOT NULL,
    'has_life_areas', v_life_areas_data IS NOT NULL,
    'has_psychology', v_psychology_data IS NOT NULL,
    'checkin_priority', v_use_checkin_priority
  );

  RETURN v_result;
END;
$function$;
-- ============================================================
-- Migration: 20260125222823_8bb5c6b7-6b08-45c3-8f3c-40df3a4ef282.sql
-- ============================================================
-- Add AI cache columns to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS ai_dashboard_cache jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ai_analysis_cache jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ai_insights_cache jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ai_cache_updated_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_data_change_at timestamp with time zone DEFAULT now();

-- Create function to update last_data_change_at on user_profiles
CREATE OR REPLACE FUNCTION public.update_user_data_change_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.user_profiles 
  SET last_data_change_at = now()
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for all data tables
DROP TRIGGER IF EXISTS trigger_checkin_data_change ON public.daily_checkins;
CREATE TRIGGER trigger_checkin_data_change
AFTER INSERT OR UPDATE ON public.daily_checkins
FOR EACH ROW EXECUTE FUNCTION public.update_user_data_change_timestamp();

DROP TRIGGER IF EXISTS trigger_session_data_change ON public.sessions;
CREATE TRIGGER trigger_session_data_change
AFTER INSERT OR UPDATE ON public.sessions
FOR EACH ROW EXECUTE FUNCTION public.update_user_data_change_timestamp();

DROP TRIGGER IF EXISTS trigger_emotions_data_change ON public.daily_emotions;
CREATE TRIGGER trigger_emotions_data_change
AFTER INSERT OR UPDATE ON public.daily_emotions
FOR EACH ROW EXECUTE FUNCTION public.update_user_data_change_timestamp();

DROP TRIGGER IF EXISTS trigger_life_areas_data_change ON public.daily_life_areas;
CREATE TRIGGER trigger_life_areas_data_change
AFTER INSERT OR UPDATE ON public.daily_life_areas
FOR EACH ROW EXECUTE FUNCTION public.update_user_data_change_timestamp();

DROP TRIGGER IF EXISTS trigger_psychology_data_change ON public.daily_psychology;
CREATE TRIGGER trigger_psychology_data_change
AFTER INSERT OR UPDATE ON public.daily_psychology
FOR EACH ROW EXECUTE FUNCTION public.update_user_data_change_timestamp();
-- ============================================================
-- Migration: 20260126000636_160d4445-0bfc-4eb3-bc8b-83145fd72791.sql
-- ============================================================

-- Fix: Add unique constraint on daily_life_areas so upsert works correctly
-- This ensures only ONE record per user+date+source
DO $$
BEGIN
  -- First, remove duplicates keeping only the most recent one per user+date+source
  DELETE FROM daily_life_areas dla1
  WHERE EXISTS (
    SELECT 1 FROM daily_life_areas dla2
    WHERE dla2.user_id = dla1.user_id
    AND dla2.date = dla1.date
    AND dla2.source = dla1.source
    AND dla2.updated_at > dla1.updated_at
  );
END $$;

-- Now add the unique constraint
ALTER TABLE daily_life_areas 
ADD CONSTRAINT daily_life_areas_user_date_source_unique 
UNIQUE (user_id, date, source);

-- Do the same for daily_emotions
DELETE FROM daily_emotions de1
WHERE EXISTS (
  SELECT 1 FROM daily_emotions de2
  WHERE de2.user_id = de1.user_id
  AND de2.date = de1.date
  AND de2.source = de1.source
  AND de2.updated_at > de1.updated_at
);

ALTER TABLE daily_emotions 
ADD CONSTRAINT daily_emotions_user_date_source_unique 
UNIQUE (user_id, date, source);

-- Do the same for daily_psychology
DELETE FROM daily_psychology dp1
WHERE EXISTS (
  SELECT 1 FROM daily_psychology dp2
  WHERE dp2.user_id = dp1.user_id
  AND dp2.date = dp1.date
  AND dp2.source = dp1.source
  AND dp2.updated_at > dp1.updated_at
);

ALTER TABLE daily_psychology 
ADD CONSTRAINT daily_psychology_user_date_source_unique 
UNIQUE (user_id, date, source);

-- ============================================================
-- Migration: 20260126232708_a2f51aac-08ed-4033-a4cb-720bfbe45937.sql
-- ============================================================
-- Create user_objectives table for expanded goal tracking
CREATE TABLE public.user_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('mind', 'body', 'study', 'work', 'relationships', 'growth', 'finance')),
  title TEXT NOT NULL,
  description TEXT,
  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,
  unit TEXT,
  deadline DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'achieved', 'paused', 'abandoned')),
  ai_feedback TEXT,
  progress_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_objectives ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own objectives"
ON public.user_objectives FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own objectives"
ON public.user_objectives FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own objectives"
ON public.user_objectives FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own objectives"
ON public.user_objectives FOR DELETE
USING (auth.uid() = user_id);

-- Doctors can view patient objectives
CREATE POLICY "Doctors can view patient objectives"
ON public.user_objectives FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM doctor_patient_access
    WHERE doctor_patient_access.patient_id = user_objectives.user_id
    AND doctor_patient_access.doctor_id = auth.uid()
    AND doctor_patient_access.is_active = true
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_user_objectives_timestamp
BEFORE UPDATE ON public.user_objectives
FOR EACH ROW
EXECUTE FUNCTION public.update_daily_tables_timestamp();

-- Trigger to update user profile last_data_change_at
CREATE TRIGGER update_objectives_data_change
AFTER INSERT OR UPDATE OR DELETE ON public.user_objectives
FOR EACH ROW
EXECUTE FUNCTION public.update_user_data_change_timestamp();
-- ============================================================
-- Migration: 20260127185819_dc483980-e4e5-4a65-ba99-1d84f2fb37e2.sql
-- ============================================================
-- Add secondary emotions to daily_emotions table
ALTER TABLE public.daily_emotions 
  ADD COLUMN IF NOT EXISTS shame integer,
  ADD COLUMN IF NOT EXISTS jealousy integer,
  ADD COLUMN IF NOT EXISTS hope integer,
  ADD COLUMN IF NOT EXISTS frustration integer,
  ADD COLUMN IF NOT EXISTS nostalgia integer;

-- Add constraints for valid range (0-10)
ALTER TABLE public.daily_emotions 
  ADD CONSTRAINT check_shame_range CHECK (shame IS NULL OR (shame >= 0 AND shame <= 10)),
  ADD CONSTRAINT check_jealousy_range CHECK (jealousy IS NULL OR (jealousy >= 0 AND jealousy <= 10)),
  ADD CONSTRAINT check_hope_range CHECK (hope IS NULL OR (hope >= 0 AND hope <= 10)),
  ADD CONSTRAINT check_frustration_range CHECK (frustration IS NULL OR (frustration >= 0 AND frustration <= 10)),
  ADD CONSTRAINT check_nostalgia_range CHECK (nostalgia IS NULL OR (nostalgia >= 0 AND nostalgia <= 10));

-- Comment on new columns for clarity
COMMENT ON COLUMN public.daily_emotions.shame IS 'Vergogna - emozione secondaria (0-10)';
COMMENT ON COLUMN public.daily_emotions.jealousy IS 'Gelosia - emozione secondaria (0-10)';
COMMENT ON COLUMN public.daily_emotions.hope IS 'Speranza - emozione secondaria (0-10)';
COMMENT ON COLUMN public.daily_emotions.frustration IS 'Frustrazione - emozione secondaria (0-10)';
COMMENT ON COLUMN public.daily_emotions.nostalgia IS 'Nostalgia - emozione secondaria (0-10)';
-- ============================================================
-- Migration: 20260127202606_0fb583b4-8109-4fd6-8069-6d51448741ea.sql
-- ============================================================
-- Add starting_value column to track the initial value for objectives
ALTER TABLE public.user_objectives 
ADD COLUMN starting_value numeric NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.user_objectives.starting_value IS 'The initial/starting value when the objective was created. Used with current_value and target_value to calculate true progress percentage.';
-- ============================================================
-- Migration: 20260127203942_553c87dd-73b2-4085-9fcf-e35aba1c7c20.sql
-- ============================================================
-- Add cache column for AI-generated checkins (same pattern as ai_dashboard_cache)
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS ai_checkins_cache jsonb DEFAULT NULL;
-- ============================================================
-- Migration: 20260127224505_27d12545-2fb4-4eae-bfd3-7e2872d8a50d.sql
-- ============================================================
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
-- ============================================================
-- Migration: 20260127232536_5e99b755-87b1-4d3e-8192-3a3fbd9815f6.sql
-- ============================================================
-- Add columns for real-time context awareness
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS location_permission_granted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS realtime_context_cache JSONB,
ADD COLUMN IF NOT EXISTS realtime_context_updated_at TIMESTAMPTZ;
-- ============================================================
-- Migration: 20260128000330_55664d97-9c09-4f01-8f7a-3c3e28646c62.sql
-- ============================================================
-- Table for global shared cache (news, etc.)
CREATE TABLE IF NOT EXISTS public.global_context_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- RLS: public read access (non-sensitive data)
ALTER TABLE public.global_context_cache ENABLE ROW LEVEL SECURITY;

-- Anyone can read the global cache
CREATE POLICY "Anyone can read global cache" ON public.global_context_cache
  FOR SELECT USING (true);

-- Only service role can write (via edge functions)
CREATE POLICY "Service role can manage global cache" ON public.global_context_cache
  FOR ALL USING (true) WITH CHECK (true);
-- ============================================================
-- Migration: 20260128002119_3ae94642-1623-41fa-aab7-866cbe65f09d.sql
-- ============================================================
-- Tabella punti utente
CREATE TABLE IF NOT EXISTS user_reward_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  total_points INTEGER NOT NULL DEFAULT 0,
  lifetime_points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Storico transazioni punti
CREATE TABLE IF NOT EXISTS reward_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  points INTEGER NOT NULL,
  type TEXT NOT NULL,
  source_id TEXT,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sistema referral
CREATE TABLE IF NOT EXISTS user_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL,
  referred_id UUID NOT NULL,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  referred_active_days INTEGER DEFAULT 0,
  points_awarded BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Colonne aggiuntive user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS premium_until TIMESTAMPTZ;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS premium_type TEXT;

-- RLS per user_reward_points
ALTER TABLE user_reward_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own points" ON user_reward_points
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own points" ON user_reward_points
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own points" ON user_reward_points
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS per reward_transactions
ALTER TABLE reward_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON reward_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON reward_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS per user_referrals
ALTER TABLE user_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referrals as referrer" ON user_referrals
  FOR SELECT USING (auth.uid() = referrer_id);

CREATE POLICY "Users can view own referrals as referred" ON user_referrals
  FOR SELECT USING (auth.uid() = referred_id);

CREATE POLICY "Users can insert referrals" ON user_referrals
  FOR INSERT WITH CHECK (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- Funzione per generare codice referral
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Trigger per generare referral_code automaticamente
CREATE OR REPLACE FUNCTION set_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := public.generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_referral_code ON user_profiles;
CREATE TRIGGER trigger_set_referral_code
  BEFORE INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_referral_code();

-- Funzione per aggiungere punti
CREATE OR REPLACE FUNCTION add_reward_points(p_user_id UUID, p_points INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_reward_points (user_id, total_points, lifetime_points)
  VALUES (p_user_id, p_points, GREATEST(p_points, 0))
  ON CONFLICT (user_id) DO UPDATE SET
    total_points = user_reward_points.total_points + p_points,
    lifetime_points = user_reward_points.lifetime_points + GREATEST(p_points, 0),
    updated_at = now();
END;
$$;
-- ============================================================
-- Migration: 20260128010436_d7ab59ad-0ad4-4be2-aa9b-722eddf402e0.sql
-- ============================================================
-- Add columns for automatic health data sync preparation
ALTER TABLE user_habits_config 
ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS auto_sync_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_auto_sync_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN user_habits_config.data_source IS 'Source of habit data: manual, apple_health, google_fit';
COMMENT ON COLUMN user_habits_config.auto_sync_enabled IS 'Whether this habit syncs automatically from external source';
COMMENT ON COLUMN user_habits_config.last_auto_sync_at IS 'Last time this habit was synced from external source';
-- ============================================================
-- Migration: 20260128230928_8875d032-4c26-466b-bd3a-c7acbee7d49c.sql
-- ============================================================
-- Aggiungere colonna per preferenze notifiche
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{
  "checkin_reminder": true,
  "checkin_time": "09:00",
  "session_reminder": true,
  "daily_insights": true,
  "goal_completed": true,
  "app_updates": false
}'::jsonb;

-- Aggiungere colonna per preferenze aspetto
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS appearance_settings JSONB DEFAULT '{
  "theme": "system",
  "large_text": false,
  "reduce_motion": false
}'::jsonb;
-- ============================================================
-- Migration: 20260129014943_7c822587-cb3b-4b5c-8c33-6e9b95ebd241.sql
-- ============================================================
-- Add new columns for objective sync and input methods
ALTER TABLE user_objectives 
ADD COLUMN IF NOT EXISTS input_method text DEFAULT 'numeric',
ADD COLUMN IF NOT EXISTS linked_habit text,
ADD COLUMN IF NOT EXISTS linked_body_metric text,
ADD COLUMN IF NOT EXISTS preset_type text,
ADD COLUMN IF NOT EXISTS auto_sync_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_auto_sync_at timestamptz,
ADD COLUMN IF NOT EXISTS progress_source text DEFAULT 'manual';

-- Add comment for documentation
COMMENT ON COLUMN user_objectives.input_method IS 'auto_body, auto_habit, numeric, milestone, counter, time_based, session_detected';
COMMENT ON COLUMN user_objectives.preset_type IS 'Preset type key like lose_weight, save_money, or null for custom';
COMMENT ON COLUMN user_objectives.progress_source IS 'habit, session, checkin, or manual';
-- ============================================================
-- Migration: 20260129234307_fe8be370-efc9-4a5f-a410-a5a315ffab15.sql
-- ============================================================
-- =====================================================
-- PROFILAZIONE 360° - AGGIUNTA NUOVI VALORI UTENTE
-- =====================================================

-- 1. EMOZIONI - Aggiungere 4 nuove emozioni
ALTER TABLE daily_emotions 
ADD COLUMN IF NOT EXISTS nervousness integer,
ADD COLUMN IF NOT EXISTS overwhelm integer,
ADD COLUMN IF NOT EXISTS excitement integer,
ADD COLUMN IF NOT EXISTS disappointment integer;

-- 2. PSICOLOGIA - Aggiungere 4 nuovi parametri cognitivi
ALTER TABLE daily_psychology 
ADD COLUMN IF NOT EXISTS concentration integer,
ADD COLUMN IF NOT EXISTS motivation integer,
ADD COLUMN IF NOT EXISTS intrusive_thoughts integer,
ADD COLUMN IF NOT EXISTS self_worth integer;

-- 3. PROFILO UTENTE - Aggiungere dati demografici
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS height numeric,
ADD COLUMN IF NOT EXISTS birth_date date,
ADD COLUMN IF NOT EXISTS gender text,
ADD COLUMN IF NOT EXISTS therapy_status text DEFAULT 'none';

-- 4. METRICHE CORPOREE - Aggiungere metriche fitness/sync
ALTER TABLE body_metrics 
ADD COLUMN IF NOT EXISTS body_fat_percentage numeric,
ADD COLUMN IF NOT EXISTS muscle_mass numeric,
ADD COLUMN IF NOT EXISTS hydration_level numeric,
ADD COLUMN IF NOT EXISTS steps integer,
ADD COLUMN IF NOT EXISTS active_minutes integer,
ADD COLUMN IF NOT EXISTS calories_burned integer;

-- 5. AGGIORNARE RPC get_daily_metrics per includere nuovi campi
CREATE OR REPLACE FUNCTION public.get_daily_metrics(p_user_id uuid, p_date date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
  v_checkin_data jsonb;
  v_session_data jsonb;
  v_emotions_data jsonb;
  v_life_areas_data jsonb;
  v_psychology_data jsonb;
  v_final_mood numeric;
  v_final_anxiety numeric;
  v_final_energy numeric;
  v_final_sleep numeric;
  v_final_joy numeric;
  v_final_sadness numeric;
  v_final_anger numeric;
  v_final_fear numeric;
  v_final_apathy numeric;
  v_final_love numeric;
  v_final_work numeric;
  v_final_health numeric;
  v_final_social numeric;
  v_final_growth numeric;
  v_checkin_age_hours numeric;
  v_use_checkin_priority boolean := false;
BEGIN
  -- 1. Get today's checkin data (if exists)
  SELECT jsonb_build_object(
    'mood_value', dc.mood_value,
    'notes', dc.notes,
    'created_at', dc.created_at,
    'age_hours', EXTRACT(EPOCH FROM (now() - dc.created_at)) / 3600
  )
  INTO v_checkin_data
  FROM daily_checkins dc
  WHERE dc.user_id = p_user_id
    AND DATE(dc.created_at) = p_date
  ORDER BY dc.created_at DESC
  LIMIT 1;

  -- Check if checkin is recent (within 2 hours) - give it priority
  IF v_checkin_data IS NOT NULL THEN
    v_checkin_age_hours := (v_checkin_data->>'age_hours')::numeric;
    v_use_checkin_priority := (v_checkin_age_hours < 2);
  END IF;

  -- 2. Get session data averages for the day
  SELECT jsonb_build_object(
    'avg_mood', AVG(s.mood_score_detected),
    'avg_anxiety', AVG(s.anxiety_score_detected),
    'avg_sleep', AVG(s.sleep_quality),
    'session_count', COUNT(*)
  )
  INTO v_session_data
  FROM sessions s
  WHERE s.user_id = p_user_id
    AND DATE(s.start_time) = p_date
    AND s.status = 'completed';

  -- 3. Get emotions from daily_emotions table (EXTENDED with new columns)
  SELECT jsonb_build_object(
    'joy', COALESCE(de.joy, 0),
    'sadness', COALESCE(de.sadness, 0),
    'anger', COALESCE(de.anger, 0),
    'fear', COALESCE(de.fear, 0),
    'apathy', COALESCE(de.apathy, 0),
    'shame', de.shame,
    'jealousy', de.jealousy,
    'hope', de.hope,
    'frustration', de.frustration,
    'nostalgia', de.nostalgia,
    'nervousness', de.nervousness,
    'overwhelm', de.overwhelm,
    'excitement', de.excitement,
    'disappointment', de.disappointment
  )
  INTO v_emotions_data
  FROM daily_emotions de
  WHERE de.user_id = p_user_id
    AND de.date = p_date
  ORDER BY de.updated_at DESC
  LIMIT 1;

  -- 4. Get life areas from daily_life_areas table
  SELECT jsonb_build_object(
    'love', dla.love,
    'work', dla.work,
    'health', dla.health,
    'social', dla.social,
    'growth', dla.growth
  )
  INTO v_life_areas_data
  FROM daily_life_areas dla
  WHERE dla.user_id = p_user_id
    AND dla.date = p_date
  ORDER BY dla.updated_at DESC
  LIMIT 1;

  -- 5. Get deep psychology from daily_psychology table (EXTENDED with new columns)
  SELECT jsonb_build_object(
    'rumination', dp.rumination,
    'self_efficacy', dp.self_efficacy,
    'mental_clarity', dp.mental_clarity,
    'burnout_level', dp.burnout_level,
    'coping_ability', dp.coping_ability,
    'loneliness_perceived', dp.loneliness_perceived,
    'somatic_tension', dp.somatic_tension,
    'appetite_changes', dp.appetite_changes,
    'sunlight_exposure', dp.sunlight_exposure,
    'guilt', dp.guilt,
    'gratitude', dp.gratitude,
    'irritability', dp.irritability,
    'concentration', dp.concentration,
    'motivation', dp.motivation,
    'intrusive_thoughts', dp.intrusive_thoughts,
    'self_worth', dp.self_worth
  )
  INTO v_psychology_data
  FROM daily_psychology dp
  WHERE dp.user_id = p_user_id
    AND dp.date = p_date
  ORDER BY dp.updated_at DESC
  LIMIT 1;

  -- 6. Calculate final vitals with priority rules
  
  -- MOOD: Checkin (1-5 scale -> 1-10) or Session (1-10)
  IF v_checkin_data IS NOT NULL THEN
    v_final_mood := ((v_checkin_data->>'mood_value')::numeric / 5) * 10;
  ELSIF v_session_data->>'avg_mood' IS NOT NULL THEN
    v_final_mood := (v_session_data->>'avg_mood')::numeric;
  ELSE
    v_final_mood := NULL;
  END IF;

  -- ANXIETY, ENERGY, SLEEP: From checkin notes (JSON) or sessions
  IF v_checkin_data IS NOT NULL AND v_checkin_data->>'notes' IS NOT NULL THEN
    BEGIN
      DECLARE
        v_notes jsonb;
      BEGIN
        v_notes := (v_checkin_data->>'notes')::jsonb;
        
        IF v_notes->>'anxiety' IS NOT NULL THEN
          v_final_anxiety := (v_notes->>'anxiety')::numeric;
        END IF;
        IF v_notes->>'energy' IS NOT NULL THEN
          v_final_energy := (v_notes->>'energy')::numeric;
        END IF;
        IF v_notes->>'sleep' IS NOT NULL THEN
          v_final_sleep := (v_notes->>'sleep')::numeric;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END;
  END IF;

  -- Fill from sessions if not set from checkin
  IF v_final_anxiety IS NULL AND v_session_data->>'avg_anxiety' IS NOT NULL THEN
    v_final_anxiety := (v_session_data->>'avg_anxiety')::numeric;
  END IF;
  
  IF v_final_sleep IS NULL AND v_session_data->>'avg_sleep' IS NOT NULL THEN
    v_final_sleep := (v_session_data->>'avg_sleep')::numeric;
  END IF;

  -- Energy: derive from mood and anxiety if not directly available
  IF v_final_energy IS NULL AND v_final_mood IS NOT NULL THEN
    v_final_energy := GREATEST(1, LEAST(10, v_final_mood - COALESCE(v_final_anxiety, 5) * 0.3 + 2));
  END IF;

  -- 7. Extract emotions (from daily_emotions table)
  IF v_emotions_data IS NOT NULL THEN
    v_final_joy := COALESCE((v_emotions_data->>'joy')::numeric, 0);
    v_final_sadness := COALESCE((v_emotions_data->>'sadness')::numeric, 0);
    v_final_anger := COALESCE((v_emotions_data->>'anger')::numeric, 0);
    v_final_fear := COALESCE((v_emotions_data->>'fear')::numeric, 0);
    v_final_apathy := COALESCE((v_emotions_data->>'apathy')::numeric, 0);
  ELSE
    v_final_joy := 0;
    v_final_sadness := 0;
    v_final_anger := 0;
    v_final_fear := 0;
    v_final_apathy := 0;
  END IF;

  -- 8. Extract life areas (from daily_life_areas table)
  IF v_life_areas_data IS NOT NULL THEN
    v_final_love := (v_life_areas_data->>'love')::numeric;
    v_final_work := (v_life_areas_data->>'work')::numeric;
    v_final_health := (v_life_areas_data->>'health')::numeric;
    v_final_social := (v_life_areas_data->>'social')::numeric;
    v_final_growth := (v_life_areas_data->>'growth')::numeric;
  END IF;

  -- 9. Build final result with ALL data unified (including extended emotions and psychology)
  v_result := jsonb_build_object(
    'date', p_date,
    'vitals', jsonb_build_object(
      'mood', ROUND(COALESCE(v_final_mood, 0)::numeric, 1),
      'anxiety', ROUND(COALESCE(v_final_anxiety, 0)::numeric, 1),
      'energy', ROUND(COALESCE(v_final_energy, 0)::numeric, 1),
      'sleep', ROUND(COALESCE(v_final_sleep, 0)::numeric, 1)
    ),
    'emotions', jsonb_build_object(
      'joy', ROUND(v_final_joy::numeric, 0),
      'sadness', ROUND(v_final_sadness::numeric, 0),
      'anger', ROUND(v_final_anger::numeric, 0),
      'fear', ROUND(v_final_fear::numeric, 0),
      'apathy', ROUND(v_final_apathy::numeric, 0)
    ),
    'emotions_extended', COALESCE(v_emotions_data, jsonb_build_object(
      'nervousness', null,
      'overwhelm', null,
      'excitement', null,
      'disappointment', null,
      'shame', null,
      'jealousy', null,
      'hope', null,
      'frustration', null,
      'nostalgia', null
    )),
    'life_areas', jsonb_build_object(
      'love', v_final_love,
      'work', v_final_work,
      'health', v_final_health,
      'social', v_final_social,
      'growth', v_final_growth
    ),
    'deep_psychology', COALESCE(v_psychology_data, jsonb_build_object(
      'rumination', null,
      'self_efficacy', null,
      'mental_clarity', null,
      'burnout_level', null,
      'coping_ability', null,
      'loneliness_perceived', null,
      'somatic_tension', null,
      'appetite_changes', null,
      'sunlight_exposure', null,
      'guilt', null,
      'gratitude', null,
      'irritability', null,
      'concentration', null,
      'motivation', null,
      'intrusive_thoughts', null,
      'self_worth', null
    )),
    'has_checkin', v_checkin_data IS NOT NULL,
    'has_sessions', (v_session_data->>'session_count')::int > 0,
    'has_emotions', v_emotions_data IS NOT NULL,
    'has_life_areas', v_life_areas_data IS NOT NULL,
    'has_psychology', v_psychology_data IS NOT NULL,
    'checkin_priority', v_use_checkin_priority
  );

  RETURN v_result;
END;
$function$;
-- ============================================================
-- Migration: 20260130003439_f47c997c-97d7-4f26-86fb-39df750cfb32.sql
-- ============================================================
-- Fix: Add authorization check to get_daily_metrics RPC function
-- This prevents any authenticated user from querying another user's metrics

CREATE OR REPLACE FUNCTION public.get_daily_metrics(p_user_id uuid, p_date date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
  v_checkin_data jsonb;
  v_session_data jsonb;
  v_emotions_data jsonb;
  v_life_areas_data jsonb;
  v_psychology_data jsonb;
  v_final_mood numeric;
  v_final_anxiety numeric;
  v_final_energy numeric;
  v_final_sleep numeric;
  v_final_joy numeric;
  v_final_sadness numeric;
  v_final_anger numeric;
  v_final_fear numeric;
  v_final_apathy numeric;
  v_final_love numeric;
  v_final_work numeric;
  v_final_health numeric;
  v_final_social numeric;
  v_final_growth numeric;
  v_checkin_age_hours numeric;
  v_use_checkin_priority boolean := false;
BEGIN
  -- SECURITY CHECK: User can only query their own metrics OR doctors can query their patients
  IF p_user_id != auth.uid() AND NOT EXISTS (
    SELECT 1 FROM public.doctor_patient_access 
    WHERE doctor_id = auth.uid() 
      AND patient_id = p_user_id 
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: can only query own metrics or assigned patients';
  END IF;

  -- 1. Get today's checkin data (if exists)
  SELECT jsonb_build_object(
    'mood_value', dc.mood_value,
    'notes', dc.notes,
    'created_at', dc.created_at,
    'age_hours', EXTRACT(EPOCH FROM (now() - dc.created_at)) / 3600
  )
  INTO v_checkin_data
  FROM daily_checkins dc
  WHERE dc.user_id = p_user_id
    AND DATE(dc.created_at) = p_date
  ORDER BY dc.created_at DESC
  LIMIT 1;

  -- Check if checkin is recent (within 2 hours) - give it priority
  IF v_checkin_data IS NOT NULL THEN
    v_checkin_age_hours := (v_checkin_data->>'age_hours')::numeric;
    v_use_checkin_priority := (v_checkin_age_hours < 2);
  END IF;

  -- 2. Get session data averages for the day
  SELECT jsonb_build_object(
    'avg_mood', AVG(s.mood_score_detected),
    'avg_anxiety', AVG(s.anxiety_score_detected),
    'avg_sleep', AVG(s.sleep_quality),
    'session_count', COUNT(*)
  )
  INTO v_session_data
  FROM sessions s
  WHERE s.user_id = p_user_id
    AND DATE(s.start_time) = p_date
    AND s.status = 'completed';

  -- 3. Get emotions from daily_emotions table (EXTENDED with new columns)
  SELECT jsonb_build_object(
    'joy', COALESCE(de.joy, 0),
    'sadness', COALESCE(de.sadness, 0),
    'anger', COALESCE(de.anger, 0),
    'fear', COALESCE(de.fear, 0),
    'apathy', COALESCE(de.apathy, 0),
    'shame', de.shame,
    'jealousy', de.jealousy,
    'hope', de.hope,
    'frustration', de.frustration,
    'nostalgia', de.nostalgia,
    'nervousness', de.nervousness,
    'overwhelm', de.overwhelm,
    'excitement', de.excitement,
    'disappointment', de.disappointment
  )
  INTO v_emotions_data
  FROM daily_emotions de
  WHERE de.user_id = p_user_id
    AND de.date = p_date
  ORDER BY de.updated_at DESC
  LIMIT 1;

  -- 4. Get life areas from daily_life_areas table
  SELECT jsonb_build_object(
    'love', dla.love,
    'work', dla.work,
    'health', dla.health,
    'social', dla.social,
    'growth', dla.growth
  )
  INTO v_life_areas_data
  FROM daily_life_areas dla
  WHERE dla.user_id = p_user_id
    AND dla.date = p_date
  ORDER BY dla.updated_at DESC
  LIMIT 1;

  -- 5. Get deep psychology from daily_psychology table (EXTENDED with new columns)
  SELECT jsonb_build_object(
    'rumination', dp.rumination,
    'self_efficacy', dp.self_efficacy,
    'mental_clarity', dp.mental_clarity,
    'burnout_level', dp.burnout_level,
    'coping_ability', dp.coping_ability,
    'loneliness_perceived', dp.loneliness_perceived,
    'somatic_tension', dp.somatic_tension,
    'appetite_changes', dp.appetite_changes,
    'sunlight_exposure', dp.sunlight_exposure,
    'guilt', dp.guilt,
    'gratitude', dp.gratitude,
    'irritability', dp.irritability,
    'concentration', dp.concentration,
    'motivation', dp.motivation,
    'intrusive_thoughts', dp.intrusive_thoughts,
    'self_worth', dp.self_worth
  )
  INTO v_psychology_data
  FROM daily_psychology dp
  WHERE dp.user_id = p_user_id
    AND dp.date = p_date
  ORDER BY dp.updated_at DESC
  LIMIT 1;

  -- 6. Calculate final vitals with priority rules
  
  -- MOOD: Checkin (1-5 scale -> 1-10) or Session (1-10)
  IF v_checkin_data IS NOT NULL THEN
    v_final_mood := ((v_checkin_data->>'mood_value')::numeric / 5) * 10;
  ELSIF v_session_data->>'avg_mood' IS NOT NULL THEN
    v_final_mood := (v_session_data->>'avg_mood')::numeric;
  ELSE
    v_final_mood := NULL;
  END IF;

  -- ANXIETY, ENERGY, SLEEP: From checkin notes (JSON) or sessions
  IF v_checkin_data IS NOT NULL AND v_checkin_data->>'notes' IS NOT NULL THEN
    BEGIN
      DECLARE
        v_notes jsonb;
      BEGIN
        v_notes := (v_checkin_data->>'notes')::jsonb;
        
        IF v_notes->>'anxiety' IS NOT NULL THEN
          v_final_anxiety := (v_notes->>'anxiety')::numeric;
        END IF;
        IF v_notes->>'energy' IS NOT NULL THEN
          v_final_energy := (v_notes->>'energy')::numeric;
        END IF;
        IF v_notes->>'sleep' IS NOT NULL THEN
          v_final_sleep := (v_notes->>'sleep')::numeric;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END;
  END IF;

  -- Fill from sessions if not set from checkin
  IF v_final_anxiety IS NULL AND v_session_data->>'avg_anxiety' IS NOT NULL THEN
    v_final_anxiety := (v_session_data->>'avg_anxiety')::numeric;
  END IF;
  
  IF v_final_sleep IS NULL AND v_session_data->>'avg_sleep' IS NOT NULL THEN
    v_final_sleep := (v_session_data->>'avg_sleep')::numeric;
  END IF;

  -- Energy: derive from mood and anxiety if not directly available
  IF v_final_energy IS NULL AND v_final_mood IS NOT NULL THEN
    v_final_energy := GREATEST(1, LEAST(10, v_final_mood - COALESCE(v_final_anxiety, 5) * 0.3 + 2));
  END IF;

  -- 7. Extract emotions (from daily_emotions table)
  IF v_emotions_data IS NOT NULL THEN
    v_final_joy := COALESCE((v_emotions_data->>'joy')::numeric, 0);
    v_final_sadness := COALESCE((v_emotions_data->>'sadness')::numeric, 0);
    v_final_anger := COALESCE((v_emotions_data->>'anger')::numeric, 0);
    v_final_fear := COALESCE((v_emotions_data->>'fear')::numeric, 0);
    v_final_apathy := COALESCE((v_emotions_data->>'apathy')::numeric, 0);
  ELSE
    v_final_joy := 0;
    v_final_sadness := 0;
    v_final_anger := 0;
    v_final_fear := 0;
    v_final_apathy := 0;
  END IF;

  -- 8. Extract life areas (from daily_life_areas table)
  IF v_life_areas_data IS NOT NULL THEN
    v_final_love := (v_life_areas_data->>'love')::numeric;
    v_final_work := (v_life_areas_data->>'work')::numeric;
    v_final_health := (v_life_areas_data->>'health')::numeric;
    v_final_social := (v_life_areas_data->>'social')::numeric;
    v_final_growth := (v_life_areas_data->>'growth')::numeric;
  END IF;

  -- 9. Build final result with ALL data unified (including extended emotions and psychology)
  v_result := jsonb_build_object(
    'date', p_date,
    'vitals', jsonb_build_object(
      'mood', ROUND(COALESCE(v_final_mood, 0)::numeric, 1),
      'anxiety', ROUND(COALESCE(v_final_anxiety, 0)::numeric, 1),
      'energy', ROUND(COALESCE(v_final_energy, 0)::numeric, 1),
      'sleep', ROUND(COALESCE(v_final_sleep, 0)::numeric, 1)
    ),
    'emotions', jsonb_build_object(
      'joy', ROUND(v_final_joy::numeric, 0),
      'sadness', ROUND(v_final_sadness::numeric, 0),
      'anger', ROUND(v_final_anger::numeric, 0),
      'fear', ROUND(v_final_fear::numeric, 0),
      'apathy', ROUND(v_final_apathy::numeric, 0)
    ),
    'emotions_extended', COALESCE(v_emotions_data, jsonb_build_object(
      'nervousness', null,
      'overwhelm', null,
      'excitement', null,
      'disappointment', null,
      'shame', null,
      'jealousy', null,
      'hope', null,
      'frustration', null,
      'nostalgia', null
    )),
    'life_areas', jsonb_build_object(
      'love', v_final_love,
      'work', v_final_work,
      'health', v_final_health,
      'social', v_final_social,
      'growth', v_final_growth
    ),
    'deep_psychology', COALESCE(v_psychology_data, jsonb_build_object(
      'rumination', null,
      'self_efficacy', null,
      'mental_clarity', null,
      'burnout_level', null,
      'coping_ability', null,
      'loneliness_perceived', null,
      'somatic_tension', null,
      'appetite_changes', null,
      'sunlight_exposure', null,
      'guilt', null,
      'gratitude', null,
      'irritability', null,
      'concentration', null,
      'motivation', null,
      'intrusive_thoughts', null,
      'self_worth', null
    )),
    'has_checkin', v_checkin_data IS NOT NULL,
    'has_sessions', (v_session_data->>'session_count')::int > 0,
    'has_emotions', v_emotions_data IS NOT NULL,
    'has_life_areas', v_life_areas_data IS NOT NULL,
    'has_psychology', v_psychology_data IS NOT NULL,
    'checkin_priority', v_use_checkin_priority
  );

  RETURN v_result;
END;
$function$;
-- ============================================================
-- Migration: 20260201120420_2c098621-79e9-4ddb-9ee0-04d4fbc1c0e2.sql
-- ============================================================
-- Add finance tracking fields to user_objectives
ALTER TABLE public.user_objectives 
ADD COLUMN IF NOT EXISTS finance_tracking_type text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS tracking_period text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS needs_clarification boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS clarification_asked_at timestamp with time zone DEFAULT NULL;

-- Comments for documentation
COMMENT ON COLUMN public.user_objectives.finance_tracking_type IS 'Type of financial tracking: accumulation, periodic_saving, spending_limit, periodic_income, debt_reduction';
COMMENT ON COLUMN public.user_objectives.tracking_period IS 'Period for periodic objectives: daily, weekly, monthly, yearly, one_time';
COMMENT ON COLUMN public.user_objectives.needs_clarification IS 'Flag to indicate Aria needs to ask for more details';
COMMENT ON COLUMN public.user_objectives.clarification_asked_at IS 'Last time Aria asked for clarification';
-- ============================================================
-- Migration: 20260202131649_2c4b8258-acc3-402a-b5ad-31744662508e.sql
-- ============================================================
-- Add checkin_visibility field to user_objectives
-- Values: 'permanent' (always visible), 'daily' (once per day), 'hidden' (only manual from Progressi)
ALTER TABLE public.user_objectives 
ADD COLUMN IF NOT EXISTS checkin_visibility text DEFAULT 'daily';

-- Add comment for documentation
COMMENT ON COLUMN public.user_objectives.checkin_visibility IS 'Controls visibility in Home check-in: permanent (always), daily (once per day), hidden (manual only)';
-- ============================================================
-- Migration: 20260202133137_a8266732-74d4-4af7-8f61-3a7b794643a7.sql
-- ============================================================
-- Add school column to daily_life_areas table for young users
-- This allows tracking "Scuola" instead of "Lavoro" for students

ALTER TABLE public.daily_life_areas 
ADD COLUMN IF NOT EXISTS school integer;

-- Add comment for documentation
COMMENT ON COLUMN public.daily_life_areas.school IS 'School satisfaction score (1-10) for students, alternative to work';

-- Update get_daily_metrics function to include school
CREATE OR REPLACE FUNCTION public.get_daily_metrics(p_user_id uuid, p_date date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
  v_checkin_data jsonb;
  v_session_data jsonb;
  v_emotions_data jsonb;
  v_life_areas_data jsonb;
  v_psychology_data jsonb;
  v_final_mood numeric;
  v_final_anxiety numeric;
  v_final_energy numeric;
  v_final_sleep numeric;
  v_final_joy numeric;
  v_final_sadness numeric;
  v_final_anger numeric;
  v_final_fear numeric;
  v_final_apathy numeric;
  v_final_love numeric;
  v_final_work numeric;
  v_final_school numeric;
  v_final_health numeric;
  v_final_social numeric;
  v_final_growth numeric;
  v_checkin_age_hours numeric;
  v_use_checkin_priority boolean := false;
BEGIN
  -- SECURITY CHECK: User can only query their own metrics OR doctors can query their patients
  IF p_user_id != auth.uid() AND NOT EXISTS (
    SELECT 1 FROM public.doctor_patient_access 
    WHERE doctor_id = auth.uid() 
      AND patient_id = p_user_id 
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: can only query own metrics or assigned patients';
  END IF;

  -- 1. Get today's checkin data (if exists)
  SELECT jsonb_build_object(
    'mood_value', dc.mood_value,
    'notes', dc.notes,
    'created_at', dc.created_at,
    'age_hours', EXTRACT(EPOCH FROM (now() - dc.created_at)) / 3600
  )
  INTO v_checkin_data
  FROM daily_checkins dc
  WHERE dc.user_id = p_user_id
    AND DATE(dc.created_at) = p_date
  ORDER BY dc.created_at DESC
  LIMIT 1;

  -- Check if checkin is recent (within 2 hours) - give it priority
  IF v_checkin_data IS NOT NULL THEN
    v_checkin_age_hours := (v_checkin_data->>'age_hours')::numeric;
    v_use_checkin_priority := (v_checkin_age_hours < 2);
  END IF;

  -- 2. Get session data averages for the day
  SELECT jsonb_build_object(
    'avg_mood', AVG(s.mood_score_detected),
    'avg_anxiety', AVG(s.anxiety_score_detected),
    'avg_sleep', AVG(s.sleep_quality),
    'session_count', COUNT(*)
  )
  INTO v_session_data
  FROM sessions s
  WHERE s.user_id = p_user_id
    AND DATE(s.start_time) = p_date
    AND s.status = 'completed';

  -- 3. Get emotions from daily_emotions table (EXTENDED with new columns)
  SELECT jsonb_build_object(
    'joy', COALESCE(de.joy, 0),
    'sadness', COALESCE(de.sadness, 0),
    'anger', COALESCE(de.anger, 0),
    'fear', COALESCE(de.fear, 0),
    'apathy', COALESCE(de.apathy, 0),
    'shame', de.shame,
    'jealousy', de.jealousy,
    'hope', de.hope,
    'frustration', de.frustration,
    'nostalgia', de.nostalgia,
    'nervousness', de.nervousness,
    'overwhelm', de.overwhelm,
    'excitement', de.excitement,
    'disappointment', de.disappointment
  )
  INTO v_emotions_data
  FROM daily_emotions de
  WHERE de.user_id = p_user_id
    AND de.date = p_date
  ORDER BY de.updated_at DESC
  LIMIT 1;

  -- 4. Get life areas from daily_life_areas table (now includes school)
  SELECT jsonb_build_object(
    'love', dla.love,
    'work', dla.work,
    'school', dla.school,
    'health', dla.health,
    'social', dla.social,
    'growth', dla.growth
  )
  INTO v_life_areas_data
  FROM daily_life_areas dla
  WHERE dla.user_id = p_user_id
    AND dla.date = p_date
  ORDER BY dla.updated_at DESC
  LIMIT 1;

  -- 5. Get deep psychology from daily_psychology table (EXTENDED with new columns)
  SELECT jsonb_build_object(
    'rumination', dp.rumination,
    'self_efficacy', dp.self_efficacy,
    'mental_clarity', dp.mental_clarity,
    'burnout_level', dp.burnout_level,
    'coping_ability', dp.coping_ability,
    'loneliness_perceived', dp.loneliness_perceived,
    'somatic_tension', dp.somatic_tension,
    'appetite_changes', dp.appetite_changes,
    'sunlight_exposure', dp.sunlight_exposure,
    'guilt', dp.guilt,
    'gratitude', dp.gratitude,
    'irritability', dp.irritability,
    'concentration', dp.concentration,
    'motivation', dp.motivation,
    'intrusive_thoughts', dp.intrusive_thoughts,
    'self_worth', dp.self_worth
  )
  INTO v_psychology_data
  FROM daily_psychology dp
  WHERE dp.user_id = p_user_id
    AND dp.date = p_date
  ORDER BY dp.updated_at DESC
  LIMIT 1;

  -- 6. Calculate final vitals with priority rules
  
  -- MOOD: Checkin (1-5 scale -> 1-10) or Session (1-10)
  IF v_checkin_data IS NOT NULL THEN
    v_final_mood := ((v_checkin_data->>'mood_value')::numeric / 5) * 10;
  ELSIF v_session_data->>'avg_mood' IS NOT NULL THEN
    v_final_mood := (v_session_data->>'avg_mood')::numeric;
  ELSE
    v_final_mood := NULL;
  END IF;

  -- ANXIETY, ENERGY, SLEEP: From checkin notes (JSON) or sessions
  IF v_checkin_data IS NOT NULL AND v_checkin_data->>'notes' IS NOT NULL THEN
    BEGIN
      DECLARE
        v_notes jsonb;
      BEGIN
        v_notes := (v_checkin_data->>'notes')::jsonb;
        
        IF v_notes->>'anxiety' IS NOT NULL THEN
          v_final_anxiety := (v_notes->>'anxiety')::numeric;
        END IF;
        IF v_notes->>'energy' IS NOT NULL THEN
          v_final_energy := (v_notes->>'energy')::numeric;
        END IF;
        IF v_notes->>'sleep' IS NOT NULL THEN
          v_final_sleep := (v_notes->>'sleep')::numeric;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END;
  END IF;

  -- Fill from sessions if not set from checkin
  IF v_final_anxiety IS NULL AND v_session_data->>'avg_anxiety' IS NOT NULL THEN
    v_final_anxiety := (v_session_data->>'avg_anxiety')::numeric;
  END IF;
  
  IF v_final_sleep IS NULL AND v_session_data->>'avg_sleep' IS NOT NULL THEN
    v_final_sleep := (v_session_data->>'avg_sleep')::numeric;
  END IF;

  -- Energy: derive from mood and anxiety if not directly available
  IF v_final_energy IS NULL AND v_final_mood IS NOT NULL THEN
    v_final_energy := GREATEST(1, LEAST(10, v_final_mood - COALESCE(v_final_anxiety, 5) * 0.3 + 2));
  END IF;

  -- 7. Extract emotions (from daily_emotions table)
  IF v_emotions_data IS NOT NULL THEN
    v_final_joy := COALESCE((v_emotions_data->>'joy')::numeric, 0);
    v_final_sadness := COALESCE((v_emotions_data->>'sadness')::numeric, 0);
    v_final_anger := COALESCE((v_emotions_data->>'anger')::numeric, 0);
    v_final_fear := COALESCE((v_emotions_data->>'fear')::numeric, 0);
    v_final_apathy := COALESCE((v_emotions_data->>'apathy')::numeric, 0);
  ELSE
    v_final_joy := 0;
    v_final_sadness := 0;
    v_final_anger := 0;
    v_final_fear := 0;
    v_final_apathy := 0;
  END IF;

  -- 8. Extract life areas (from daily_life_areas table, now includes school)
  IF v_life_areas_data IS NOT NULL THEN
    v_final_love := (v_life_areas_data->>'love')::numeric;
    v_final_work := (v_life_areas_data->>'work')::numeric;
    v_final_school := (v_life_areas_data->>'school')::numeric;
    v_final_health := (v_life_areas_data->>'health')::numeric;
    v_final_social := (v_life_areas_data->>'social')::numeric;
    v_final_growth := (v_life_areas_data->>'growth')::numeric;
  END IF;

  -- 9. Build final result with ALL data unified (including extended emotions and psychology)
  v_result := jsonb_build_object(
    'date', p_date,
    'vitals', jsonb_build_object(
      'mood', ROUND(COALESCE(v_final_mood, 0)::numeric, 1),
      'anxiety', ROUND(COALESCE(v_final_anxiety, 0)::numeric, 1),
      'energy', ROUND(COALESCE(v_final_energy, 0)::numeric, 1),
      'sleep', ROUND(COALESCE(v_final_sleep, 0)::numeric, 1)
    ),
    'emotions', jsonb_build_object(
      'joy', ROUND(v_final_joy::numeric, 0),
      'sadness', ROUND(v_final_sadness::numeric, 0),
      'anger', ROUND(v_final_anger::numeric, 0),
      'fear', ROUND(v_final_fear::numeric, 0),
      'apathy', ROUND(v_final_apathy::numeric, 0)
    ),
    'emotions_extended', COALESCE(v_emotions_data, jsonb_build_object(
      'nervousness', null,
      'overwhelm', null,
      'excitement', null,
      'disappointment', null,
      'shame', null,
      'jealousy', null,
      'hope', null,
      'frustration', null,
      'nostalgia', null
    )),
    'life_areas', jsonb_build_object(
      'love', v_final_love,
      'work', v_final_work,
      'school', v_final_school,
      'health', v_final_health,
      'social', v_final_social,
      'growth', v_final_growth
    ),
    'deep_psychology', COALESCE(v_psychology_data, jsonb_build_object(
      'rumination', null,
      'self_efficacy', null,
      'mental_clarity', null,
      'burnout_level', null,
      'coping_ability', null,
      'loneliness_perceived', null,
      'somatic_tension', null,
      'appetite_changes', null,
      'sunlight_exposure', null,
      'guilt', null,
      'gratitude', null,
      'irritability', null,
      'concentration', null,
      'motivation', null,
      'intrusive_thoughts', null,
      'self_worth', null
    )),
    'has_checkin', v_checkin_data IS NOT NULL,
    'has_sessions', (v_session_data->>'session_count')::int > 0,
    'has_emotions', v_emotions_data IS NOT NULL,
    'has_life_areas', v_life_areas_data IS NOT NULL,
    'has_psychology', v_psychology_data IS NOT NULL,
    'checkin_priority', v_use_checkin_priority
  );

  RETURN v_result;
END;
$function$;
-- ============================================================
-- Migration: 20260202135708_8fbe382e-3752-4bc6-aa6c-a4aae6716506.sql
-- ============================================================
-- Add AI-managed fields for milestone/qualitative objectives
-- These fields are ONLY updated by Aria (AI), not manually

-- AI-generated custom description based on conversation details
ALTER TABLE public.user_objectives 
ADD COLUMN IF NOT EXISTS ai_custom_description TEXT DEFAULT NULL;

-- AI-estimated progress for milestone objectives (0-100)
ALTER TABLE public.user_objectives 
ADD COLUMN IF NOT EXISTS ai_progress_estimate INTEGER DEFAULT NULL;

-- JSON array of detected milestones/achievements
-- Format: [{"milestone": "Creato profilo LinkedIn", "achieved_at": "2024-01-15", "note": "Primo passo!"}, ...]
ALTER TABLE public.user_objectives 
ADD COLUMN IF NOT EXISTS ai_milestones JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.user_objectives.ai_custom_description IS 'AI-generated description with user-specific details (e.g., brand name "Moda", domain "vestiti")';
COMMENT ON COLUMN public.user_objectives.ai_progress_estimate IS 'AI-estimated progress 0-100 for milestone/qualitative objectives';
COMMENT ON COLUMN public.user_objectives.ai_milestones IS 'JSON array of detected milestones: [{milestone, achieved_at, note}]';
-- ============================================================
-- Migration: 20260202142839_81fa5cd7-6908-4fe9-9cb7-62cbfc230b37.sql
-- ============================================================
-- Create triggers to update last_data_change_at when user data changes
-- This ensures the AI cache gets invalidated and refreshed

-- Trigger for sessions
CREATE TRIGGER update_user_data_on_session_change
AFTER INSERT OR UPDATE ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_user_data_change_timestamp();

-- Trigger for daily_checkins
CREATE TRIGGER update_user_data_on_checkin_change
AFTER INSERT OR UPDATE ON public.daily_checkins
FOR EACH ROW
EXECUTE FUNCTION public.update_user_data_change_timestamp();

-- Trigger for daily_emotions
CREATE TRIGGER update_user_data_on_emotions_change
AFTER INSERT OR UPDATE ON public.daily_emotions
FOR EACH ROW
EXECUTE FUNCTION public.update_user_data_change_timestamp();

-- Trigger for daily_life_areas
CREATE TRIGGER update_user_data_on_life_areas_change
AFTER INSERT OR UPDATE ON public.daily_life_areas
FOR EACH ROW
EXECUTE FUNCTION public.update_user_data_change_timestamp();

-- Trigger for daily_psychology
CREATE TRIGGER update_user_data_on_psychology_change
AFTER INSERT OR UPDATE ON public.daily_psychology
FOR EACH ROW
EXECUTE FUNCTION public.update_user_data_change_timestamp();

-- Trigger for body_metrics
CREATE TRIGGER update_user_data_on_body_metrics_change
AFTER INSERT OR UPDATE ON public.body_metrics
FOR EACH ROW
EXECUTE FUNCTION public.update_user_data_change_timestamp();

-- Trigger for daily_habits
CREATE TRIGGER update_user_data_on_habits_change
AFTER INSERT OR UPDATE ON public.daily_habits
FOR EACH ROW
EXECUTE FUNCTION public.update_user_data_change_timestamp();
-- ============================================================
-- Migration: 20260202151330_32ba32c2-c912-40b4-a201-7028fb8840b5.sql
-- ============================================================
-- Add columns for AI-driven habit creation and update methods
ALTER TABLE user_habits_config 
ADD COLUMN update_method TEXT DEFAULT 'checkin',
ADD COLUMN requires_permission BOOLEAN DEFAULT FALSE,
ADD COLUMN permission_granted BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN user_habits_config.update_method IS 'Method for updating habit: checkin, chat, auto_sync';
COMMENT ON COLUMN user_habits_config.requires_permission IS 'Whether habit requires external app permission';
COMMENT ON COLUMN user_habits_config.permission_granted IS 'Whether user has granted the required permission';
-- ============================================================
-- Migration: 20260202153558_f7c674ac-519d-49f3-bcbb-c90bbf1e4569.sql
-- ============================================================
-- Add reminder fields to user_habits_config
ALTER TABLE public.user_habits_config 
ADD COLUMN reminder_enabled boolean DEFAULT false,
ADD COLUMN reminder_time time DEFAULT '09:00:00';
-- ============================================================
-- Migration: 20260203175434_97417818-9a7f-43f2-a445-24b206acf2ae.sql
-- ============================================================
-- Add occupation_context field to user_profiles
-- Values: 'student', 'worker', 'both', null (null = needs to be asked by Aria)
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS occupation_context text DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.user_profiles.occupation_context IS 'User occupation status: student, worker, both, or null (needs clarification from Aria for 18-27 age range)';
-- ============================================================
-- Migration: 20260203194634_db7efd52-755a-49d5-b8f0-59a2e771f63f.sql
-- ============================================================
-- Drop existing function and recreate with fix
DROP FUNCTION IF EXISTS public.get_daily_metrics(uuid, date);

-- Fix get_daily_metrics to prioritize session mood when checkin mood is 0 (no explicit mood check-in)
CREATE FUNCTION public.get_daily_metrics(p_user_id uuid, p_date date DEFAULT CURRENT_DATE)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  v_checkin record;
  v_session record;
  v_emotions record;
  v_life_areas record;
  v_psychology record;
  v_mood numeric := 0;
  v_anxiety numeric := 0;
  v_energy numeric := 0;
  v_sleep numeric := 0;
  v_has_checkin boolean := false;
  v_has_sessions boolean := false;
  v_has_emotions boolean := false;
  v_has_life_areas boolean := false;
  v_has_psychology boolean := false;
  v_checkin_priority boolean := false;
BEGIN
  -- Get today's checkin (most recent)
  SELECT * INTO v_checkin FROM daily_checkins
  WHERE user_id = p_user_id
    AND DATE(created_at AT TIME ZONE 'Europe/Rome') = p_date
  ORDER BY created_at DESC
  LIMIT 1;

  -- Get today's completed sessions (aggregate)
  SELECT 
    AVG(COALESCE(mood_score_detected, 0)) FILTER (WHERE mood_score_detected > 0) as avg_mood,
    AVG(COALESCE(anxiety_score_detected, 0)) FILTER (WHERE anxiety_score_detected > 0) as avg_anxiety,
    AVG(COALESCE(sleep_quality, 0)) FILTER (WHERE sleep_quality > 0) as avg_sleep,
    COUNT(*) as session_count
  INTO v_session
  FROM sessions
  WHERE user_id = p_user_id
    AND DATE(start_time AT TIME ZONE 'Europe/Rome') = p_date
    AND status = 'completed';

  -- Check if we have data
  IF v_checkin IS NOT NULL THEN
    v_has_checkin := true;
    -- 🐛 FIX: Only use checkin mood if it's > 0 (explicit mood check-in)
    -- mood_value = 0 means user only answered other vitals (sleep, anxiety, energy)
    IF v_checkin.mood_value > 0 THEN
      v_mood := v_checkin.mood_value * 2; -- Convert 1-5 to 1-10 scale
      v_checkin_priority := true;
    END IF;
    
    -- Parse notes for other vitals
    IF v_checkin.notes IS NOT NULL THEN
      BEGIN
        v_anxiety := COALESCE((v_checkin.notes::json->>'anxiety')::numeric, 0);
        v_energy := COALESCE((v_checkin.notes::json->>'energy')::numeric, 0);
        v_sleep := COALESCE((v_checkin.notes::json->>'sleep')::numeric, 0);
      EXCEPTION WHEN OTHERS THEN
        -- Ignore JSON parse errors
      END;
    END IF;
  END IF;

  -- Session data processing
  IF v_session IS NOT NULL AND v_session.session_count > 0 THEN
    v_has_sessions := true;
    -- 🐛 FIX: Use session mood when there's no explicit checkin mood
    IF v_mood = 0 AND v_session.avg_mood IS NOT NULL THEN
      v_mood := v_session.avg_mood;
    END IF;
    -- Fill in missing vitals from sessions
    IF v_anxiety = 0 AND v_session.avg_anxiety IS NOT NULL THEN
      v_anxiety := v_session.avg_anxiety;
    END IF;
    IF v_sleep = 0 AND v_session.avg_sleep IS NOT NULL THEN
      v_sleep := v_session.avg_sleep;
    END IF;
  END IF;

  -- Get today's emotions
  SELECT * INTO v_emotions FROM daily_emotions
  WHERE user_id = p_user_id AND date = p_date
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_emotions IS NOT NULL THEN
    v_has_emotions := true;
  END IF;

  -- Get today's life areas
  SELECT * INTO v_life_areas FROM daily_life_areas
  WHERE user_id = p_user_id AND date = p_date
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_life_areas IS NOT NULL THEN
    v_has_life_areas := true;
  END IF;

  -- Get today's psychology
  SELECT * INTO v_psychology FROM daily_psychology
  WHERE user_id = p_user_id AND date = p_date
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_psychology IS NOT NULL THEN
    v_has_psychology := true;
  END IF;

  -- Build result JSON
  result := json_build_object(
    'date', p_date,
    'vitals', json_build_object(
      'mood', COALESCE(v_mood, 0),
      'anxiety', COALESCE(v_anxiety, 0),
      'energy', COALESCE(v_energy, 0),
      'sleep', COALESCE(v_sleep, 0)
    ),
    'emotions', json_build_object(
      'joy', COALESCE(v_emotions.joy, 0),
      'sadness', COALESCE(v_emotions.sadness, 0),
      'anger', COALESCE(v_emotions.anger, 0),
      'fear', COALESCE(v_emotions.fear, 0),
      'apathy', COALESCE(v_emotions.apathy, 0)
    ),
    'life_areas', json_build_object(
      'love', v_life_areas.love,
      'work', v_life_areas.work,
      'school', v_life_areas.school,
      'health', v_life_areas.health,
      'social', v_life_areas.social,
      'growth', v_life_areas.growth
    ),
    'deep_psychology', json_build_object(
      'rumination', v_psychology.rumination,
      'self_efficacy', v_psychology.self_efficacy,
      'mental_clarity', v_psychology.mental_clarity,
      'concentration', v_psychology.concentration,
      'burnout_level', v_psychology.burnout_level,
      'coping_ability', v_psychology.coping_ability,
      'loneliness_perceived', v_psychology.loneliness_perceived,
      'somatic_tension', v_psychology.somatic_tension,
      'appetite_changes', v_psychology.appetite_changes,
      'sunlight_exposure', v_psychology.sunlight_exposure,
      'guilt', v_psychology.guilt,
      'gratitude', v_psychology.gratitude,
      'irritability', v_psychology.irritability,
      'motivation', v_psychology.motivation,
      'intrusive_thoughts', v_psychology.intrusive_thoughts,
      'self_worth', v_psychology.self_worth
    ),
    'has_checkin', v_has_checkin,
    'has_sessions', v_has_sessions,
    'has_emotions', v_has_emotions,
    'has_life_areas', v_has_life_areas,
    'has_psychology', v_has_psychology,
    'checkin_priority', v_checkin_priority
  );

  RETURN result;
END;
$$;
-- ============================================================
-- Migration: 20260203194703_e6b99001-8897-4068-a3d3-b3a3f176d074.sql
-- ============================================================
-- Allow mood_value = 0 to indicate "no explicit mood check-in"
ALTER TABLE daily_checkins 
DROP CONSTRAINT IF EXISTS daily_checkins_mood_value_check;

ALTER TABLE daily_checkins 
ADD CONSTRAINT daily_checkins_mood_value_check 
CHECK (mood_value >= 0 AND mood_value <= 5);
-- ============================================================
-- Migration: 20260203194818_767265ae-2be5-45df-b049-4e66ca478a5a.sql
-- ============================================================
-- Drop and recreate function with improved session detection
DROP FUNCTION IF EXISTS public.get_daily_metrics(uuid, date);

CREATE FUNCTION public.get_daily_metrics(p_user_id uuid, p_date date DEFAULT CURRENT_DATE)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  v_checkin record;
  v_session_count integer;
  v_session_mood numeric;
  v_session_anxiety numeric;
  v_session_sleep numeric;
  v_emotions record;
  v_life_areas record;
  v_psychology record;
  v_mood numeric := 0;
  v_anxiety numeric := 0;
  v_energy numeric := 0;
  v_sleep numeric := 0;
  v_has_checkin boolean := false;
  v_has_sessions boolean := false;
  v_has_emotions boolean := false;
  v_has_life_areas boolean := false;
  v_has_psychology boolean := false;
  v_checkin_priority boolean := false;
BEGIN
  -- Get today's checkin (most recent)
  SELECT * INTO v_checkin FROM daily_checkins
  WHERE user_id = p_user_id
    AND DATE(created_at AT TIME ZONE 'Europe/Rome') = p_date
  ORDER BY created_at DESC
  LIMIT 1;

  -- Get today's completed sessions (individual values, not a single record)
  SELECT 
    COUNT(*),
    AVG(mood_score_detected) FILTER (WHERE mood_score_detected > 0),
    AVG(anxiety_score_detected) FILTER (WHERE anxiety_score_detected > 0),
    AVG(sleep_quality) FILTER (WHERE sleep_quality > 0)
  INTO v_session_count, v_session_mood, v_session_anxiety, v_session_sleep
  FROM sessions
  WHERE user_id = p_user_id
    AND DATE(start_time AT TIME ZONE 'Europe/Rome') = p_date
    AND status = 'completed';

  -- Check if we have checkin data
  IF v_checkin IS NOT NULL THEN
    v_has_checkin := true;
    -- Only use checkin mood if it's > 0 (explicit mood check-in)
    IF v_checkin.mood_value > 0 THEN
      v_mood := v_checkin.mood_value * 2; -- Convert 1-5 to 1-10 scale
      v_checkin_priority := true;
    END IF;
    
    -- Parse notes for other vitals
    IF v_checkin.notes IS NOT NULL THEN
      BEGIN
        v_anxiety := COALESCE((v_checkin.notes::json->>'anxiety')::numeric, 0);
        v_energy := COALESCE((v_checkin.notes::json->>'energy')::numeric, 0);
        v_sleep := COALESCE((v_checkin.notes::json->>'sleep')::numeric, 0);
      EXCEPTION WHEN OTHERS THEN
        NULL; -- Ignore JSON parse errors
      END;
    END IF;
  END IF;

  -- Session data processing
  IF v_session_count > 0 THEN
    v_has_sessions := true;
    -- Use session mood when there's no explicit checkin mood
    IF v_mood = 0 AND v_session_mood IS NOT NULL THEN
      v_mood := v_session_mood;
    END IF;
    -- Fill in missing vitals from sessions
    IF v_anxiety = 0 AND v_session_anxiety IS NOT NULL THEN
      v_anxiety := v_session_anxiety;
    END IF;
    IF v_sleep = 0 AND v_session_sleep IS NOT NULL THEN
      v_sleep := v_session_sleep;
    END IF;
  END IF;

  -- Get today's emotions
  SELECT * INTO v_emotions FROM daily_emotions
  WHERE user_id = p_user_id AND date = p_date
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_emotions IS NOT NULL THEN
    v_has_emotions := true;
  END IF;

  -- Get today's life areas
  SELECT * INTO v_life_areas FROM daily_life_areas
  WHERE user_id = p_user_id AND date = p_date
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_life_areas IS NOT NULL THEN
    v_has_life_areas := true;
  END IF;

  -- Get today's psychology
  SELECT * INTO v_psychology FROM daily_psychology
  WHERE user_id = p_user_id AND date = p_date
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_psychology IS NOT NULL THEN
    v_has_psychology := true;
  END IF;

  -- Build result JSON
  result := json_build_object(
    'date', p_date,
    'vitals', json_build_object(
      'mood', COALESCE(v_mood, 0),
      'anxiety', COALESCE(v_anxiety, 0),
      'energy', COALESCE(v_energy, 0),
      'sleep', COALESCE(v_sleep, 0)
    ),
    'emotions', json_build_object(
      'joy', COALESCE(v_emotions.joy, 0),
      'sadness', COALESCE(v_emotions.sadness, 0),
      'anger', COALESCE(v_emotions.anger, 0),
      'fear', COALESCE(v_emotions.fear, 0),
      'apathy', COALESCE(v_emotions.apathy, 0)
    ),
    'life_areas', json_build_object(
      'love', v_life_areas.love,
      'work', v_life_areas.work,
      'school', v_life_areas.school,
      'health', v_life_areas.health,
      'social', v_life_areas.social,
      'growth', v_life_areas.growth
    ),
    'deep_psychology', json_build_object(
      'rumination', v_psychology.rumination,
      'self_efficacy', v_psychology.self_efficacy,
      'mental_clarity', v_psychology.mental_clarity,
      'concentration', v_psychology.concentration,
      'burnout_level', v_psychology.burnout_level,
      'coping_ability', v_psychology.coping_ability,
      'loneliness_perceived', v_psychology.loneliness_perceived,
      'somatic_tension', v_psychology.somatic_tension,
      'appetite_changes', v_psychology.appetite_changes,
      'sunlight_exposure', v_psychology.sunlight_exposure,
      'guilt', v_psychology.guilt,
      'gratitude', v_psychology.gratitude,
      'irritability', v_psychology.irritability,
      'motivation', v_psychology.motivation,
      'intrusive_thoughts', v_psychology.intrusive_thoughts,
      'self_worth', v_psychology.self_worth
    ),
    'has_checkin', v_has_checkin,
    'has_sessions', v_has_sessions,
    'has_emotions', v_has_emotions,
    'has_life_areas', v_has_life_areas,
    'has_psychology', v_has_psychology,
    'checkin_priority', v_checkin_priority
  );

  RETURN result;
END;
$$;
-- ============================================================
-- Migration: 20260204004824_c28d7726-1e53-4feb-89c5-a7578a7d3f63.sql
-- ============================================================
-- Fix: Allow 0 values in daily_psychology constraints (AI returns 0 for "not detected")

-- Drop old constraints
ALTER TABLE daily_psychology DROP CONSTRAINT IF EXISTS daily_psychology_appetite_changes_check;
ALTER TABLE daily_psychology DROP CONSTRAINT IF EXISTS daily_psychology_burnout_level_check;
ALTER TABLE daily_psychology DROP CONSTRAINT IF EXISTS daily_psychology_coping_ability_check;
ALTER TABLE daily_psychology DROP CONSTRAINT IF EXISTS daily_psychology_gratitude_check;
ALTER TABLE daily_psychology DROP CONSTRAINT IF EXISTS daily_psychology_guilt_check;
ALTER TABLE daily_psychology DROP CONSTRAINT IF EXISTS daily_psychology_irritability_check;
ALTER TABLE daily_psychology DROP CONSTRAINT IF EXISTS daily_psychology_loneliness_perceived_check;
ALTER TABLE daily_psychology DROP CONSTRAINT IF EXISTS daily_psychology_mental_clarity_check;
ALTER TABLE daily_psychology DROP CONSTRAINT IF EXISTS daily_psychology_rumination_check;
ALTER TABLE daily_psychology DROP CONSTRAINT IF EXISTS daily_psychology_self_efficacy_check;
ALTER TABLE daily_psychology DROP CONSTRAINT IF EXISTS daily_psychology_somatic_tension_check;
ALTER TABLE daily_psychology DROP CONSTRAINT IF EXISTS daily_psychology_sunlight_exposure_check;

-- Add new constraints allowing 0-10 range
ALTER TABLE daily_psychology ADD CONSTRAINT daily_psychology_appetite_changes_check CHECK (appetite_changes IS NULL OR (appetite_changes >= 0 AND appetite_changes <= 10));
ALTER TABLE daily_psychology ADD CONSTRAINT daily_psychology_burnout_level_check CHECK (burnout_level IS NULL OR (burnout_level >= 0 AND burnout_level <= 10));
ALTER TABLE daily_psychology ADD CONSTRAINT daily_psychology_coping_ability_check CHECK (coping_ability IS NULL OR (coping_ability >= 0 AND coping_ability <= 10));
ALTER TABLE daily_psychology ADD CONSTRAINT daily_psychology_gratitude_check CHECK (gratitude IS NULL OR (gratitude >= 0 AND gratitude <= 10));
ALTER TABLE daily_psychology ADD CONSTRAINT daily_psychology_guilt_check CHECK (guilt IS NULL OR (guilt >= 0 AND guilt <= 10));
ALTER TABLE daily_psychology ADD CONSTRAINT daily_psychology_irritability_check CHECK (irritability IS NULL OR (irritability >= 0 AND irritability <= 10));
ALTER TABLE daily_psychology ADD CONSTRAINT daily_psychology_loneliness_perceived_check CHECK (loneliness_perceived IS NULL OR (loneliness_perceived >= 0 AND loneliness_perceived <= 10));
ALTER TABLE daily_psychology ADD CONSTRAINT daily_psychology_mental_clarity_check CHECK (mental_clarity IS NULL OR (mental_clarity >= 0 AND mental_clarity <= 10));
ALTER TABLE daily_psychology ADD CONSTRAINT daily_psychology_rumination_check CHECK (rumination IS NULL OR (rumination >= 0 AND rumination <= 10));
ALTER TABLE daily_psychology ADD CONSTRAINT daily_psychology_self_efficacy_check CHECK (self_efficacy IS NULL OR (self_efficacy >= 0 AND self_efficacy <= 10));
ALTER TABLE daily_psychology ADD CONSTRAINT daily_psychology_somatic_tension_check CHECK (somatic_tension IS NULL OR (somatic_tension >= 0 AND somatic_tension <= 10));
ALTER TABLE daily_psychology ADD CONSTRAINT daily_psychology_sunlight_exposure_check CHECK (sunlight_exposure IS NULL OR (sunlight_exposure >= 0 AND sunlight_exposure <= 10));
-- ============================================================
-- Migration: 20260204010112_ac3aab41-b658-408b-b545-cac49476c150.sql
-- ============================================================
-- Add energy_score_detected column to sessions table
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS energy_score_detected integer;

-- Update the get_daily_metrics function to include energy from sessions
CREATE OR REPLACE FUNCTION public.get_daily_metrics(p_user_id uuid, p_date date DEFAULT CURRENT_DATE)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result json;
  v_checkin record;
  v_session_count integer;
  v_session_mood numeric;
  v_session_anxiety numeric;
  v_session_sleep numeric;
  v_session_energy numeric;
  v_emotions record;
  v_life_areas record;
  v_psychology record;
  v_mood numeric := 0;
  v_anxiety numeric := 0;
  v_energy numeric := 0;
  v_sleep numeric := 0;
  v_has_checkin boolean := false;
  v_has_sessions boolean := false;
  v_has_emotions boolean := false;
  v_has_life_areas boolean := false;
  v_has_psychology boolean := false;
  v_checkin_priority boolean := false;
BEGIN
  -- Get today's checkin (most recent)
  SELECT * INTO v_checkin FROM daily_checkins
  WHERE user_id = p_user_id
    AND DATE(created_at AT TIME ZONE 'Europe/Rome') = p_date
  ORDER BY created_at DESC
  LIMIT 1;

  -- Get today's completed sessions (including energy)
  SELECT 
    COUNT(*),
    AVG(mood_score_detected) FILTER (WHERE mood_score_detected > 0),
    AVG(anxiety_score_detected) FILTER (WHERE anxiety_score_detected > 0),
    AVG(sleep_quality) FILTER (WHERE sleep_quality > 0),
    AVG(energy_score_detected) FILTER (WHERE energy_score_detected > 0)
  INTO v_session_count, v_session_mood, v_session_anxiety, v_session_sleep, v_session_energy
  FROM sessions
  WHERE user_id = p_user_id
    AND DATE(start_time AT TIME ZONE 'Europe/Rome') = p_date
    AND status = 'completed';

  -- Check if we have checkin data
  IF v_checkin IS NOT NULL THEN
    v_has_checkin := true;
    -- Only use checkin mood if it's > 0 (explicit mood check-in)
    IF v_checkin.mood_value > 0 THEN
      v_mood := v_checkin.mood_value * 2; -- Convert 1-5 to 1-10 scale
      v_checkin_priority := true;
    END IF;
    
    -- Parse notes for other vitals
    IF v_checkin.notes IS NOT NULL THEN
      BEGIN
        v_anxiety := COALESCE((v_checkin.notes::json->>'anxiety')::numeric, 0);
        v_energy := COALESCE((v_checkin.notes::json->>'energy')::numeric, 0);
        v_sleep := COALESCE((v_checkin.notes::json->>'sleep')::numeric, 0);
      EXCEPTION WHEN OTHERS THEN
        NULL; -- Ignore JSON parse errors
      END;
    END IF;
  END IF;

  -- Session data processing
  IF v_session_count > 0 THEN
    v_has_sessions := true;
    -- Use session mood when there's no explicit checkin mood
    IF v_mood = 0 AND v_session_mood IS NOT NULL THEN
      v_mood := v_session_mood;
    END IF;
    -- Fill in missing vitals from sessions
    IF v_anxiety = 0 AND v_session_anxiety IS NOT NULL THEN
      v_anxiety := v_session_anxiety;
    END IF;
    IF v_sleep = 0 AND v_session_sleep IS NOT NULL THEN
      v_sleep := v_session_sleep;
    END IF;
    -- NEW: Fill in energy from sessions
    IF v_energy = 0 AND v_session_energy IS NOT NULL THEN
      v_energy := v_session_energy;
    END IF;
  END IF;

  -- Get today's emotions
  SELECT * INTO v_emotions FROM daily_emotions
  WHERE user_id = p_user_id AND date = p_date
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_emotions IS NOT NULL THEN
    v_has_emotions := true;
  END IF;

  -- Get today's life areas
  SELECT * INTO v_life_areas FROM daily_life_areas
  WHERE user_id = p_user_id AND date = p_date
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_life_areas IS NOT NULL THEN
    v_has_life_areas := true;
  END IF;

  -- Get today's psychology
  SELECT * INTO v_psychology FROM daily_psychology
  WHERE user_id = p_user_id AND date = p_date
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_psychology IS NOT NULL THEN
    v_has_psychology := true;
  END IF;

  -- Build result JSON
  result := json_build_object(
    'date', p_date,
    'vitals', json_build_object(
      'mood', COALESCE(v_mood, 0),
      'anxiety', COALESCE(v_anxiety, 0),
      'energy', COALESCE(v_energy, 0),
      'sleep', COALESCE(v_sleep, 0)
    ),
    'emotions', json_build_object(
      'joy', COALESCE(v_emotions.joy, 0),
      'sadness', COALESCE(v_emotions.sadness, 0),
      'anger', COALESCE(v_emotions.anger, 0),
      'fear', COALESCE(v_emotions.fear, 0),
      'apathy', COALESCE(v_emotions.apathy, 0)
    ),
    'life_areas', json_build_object(
      'love', v_life_areas.love,
      'work', v_life_areas.work,
      'school', v_life_areas.school,
      'health', v_life_areas.health,
      'social', v_life_areas.social,
      'growth', v_life_areas.growth
    ),
    'deep_psychology', json_build_object(
      'rumination', v_psychology.rumination,
      'self_efficacy', v_psychology.self_efficacy,
      'mental_clarity', v_psychology.mental_clarity,
      'concentration', v_psychology.concentration,
      'burnout_level', v_psychology.burnout_level,
      'coping_ability', v_psychology.coping_ability,
      'loneliness_perceived', v_psychology.loneliness_perceived,
      'somatic_tension', v_psychology.somatic_tension,
      'appetite_changes', v_psychology.appetite_changes,
      'sunlight_exposure', v_psychology.sunlight_exposure,
      'guilt', v_psychology.guilt,
      'gratitude', v_psychology.gratitude,
      'irritability', v_psychology.irritability,
      'motivation', v_psychology.motivation,
      'intrusive_thoughts', v_psychology.intrusive_thoughts,
      'self_worth', v_psychology.self_worth
    ),
    'has_checkin', v_has_checkin,
    'has_sessions', v_has_sessions,
    'has_emotions', v_has_emotions,
    'has_life_areas', v_has_life_areas,
    'has_psychology', v_has_psychology,
    'checkin_priority', v_checkin_priority
  );

  RETURN result;
END;
$function$;
-- ============================================================
-- Migration: 20260204020408_4462aeb5-81ed-48b5-95e7-d0a96c7095ac.sql
-- ============================================================
-- Fix get_daily_metrics to merge life areas from multiple sources
CREATE OR REPLACE FUNCTION public.get_daily_metrics(p_user_id uuid, p_date date DEFAULT CURRENT_DATE)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
  v_checkin record;
  v_session_count integer;
  v_session_mood numeric;
  v_session_anxiety numeric;
  v_session_sleep numeric;
  v_session_energy numeric;
  v_emotions record;
  v_life_areas record;
  v_psychology record;
  v_mood numeric := 0;
  v_anxiety numeric := 0;
  v_energy numeric := 0;
  v_sleep numeric := 0;
  v_has_checkin boolean := false;
  v_has_sessions boolean := false;
  v_has_emotions boolean := false;
  v_has_life_areas boolean := false;
  v_has_psychology boolean := false;
  v_checkin_priority boolean := false;
  -- Life areas aggregated
  v_la_work integer;
  v_la_school integer;
  v_la_love integer;
  v_la_social integer;
  v_la_health integer;
  v_la_growth integer;
BEGIN
  -- Get today's checkin (most recent)
  SELECT * INTO v_checkin FROM daily_checkins
  WHERE user_id = p_user_id
    AND DATE(created_at AT TIME ZONE 'Europe/Rome') = p_date
  ORDER BY created_at DESC
  LIMIT 1;

  -- Get today's completed sessions (including energy)
  SELECT 
    COUNT(*),
    AVG(mood_score_detected) FILTER (WHERE mood_score_detected > 0),
    AVG(anxiety_score_detected) FILTER (WHERE anxiety_score_detected > 0),
    AVG(sleep_quality) FILTER (WHERE sleep_quality > 0),
    AVG(energy_score_detected) FILTER (WHERE energy_score_detected > 0)
  INTO v_session_count, v_session_mood, v_session_anxiety, v_session_sleep, v_session_energy
  FROM sessions
  WHERE user_id = p_user_id
    AND DATE(start_time AT TIME ZONE 'Europe/Rome') = p_date
    AND status = 'completed';

  -- Check if we have checkin data
  IF v_checkin IS NOT NULL THEN
    v_has_checkin := true;
    IF v_checkin.mood_value > 0 THEN
      v_mood := v_checkin.mood_value * 2;
      v_checkin_priority := true;
    END IF;
    
    IF v_checkin.notes IS NOT NULL THEN
      BEGIN
        v_anxiety := COALESCE((v_checkin.notes::json->>'anxiety')::numeric, 0);
        v_energy := COALESCE((v_checkin.notes::json->>'energy')::numeric, 0);
        v_sleep := COALESCE((v_checkin.notes::json->>'sleep')::numeric, 0);
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;
  END IF;

  -- Session data processing
  IF v_session_count > 0 THEN
    v_has_sessions := true;
    IF v_mood = 0 AND v_session_mood IS NOT NULL THEN
      v_mood := v_session_mood;
    END IF;
    IF v_anxiety = 0 AND v_session_anxiety IS NOT NULL THEN
      v_anxiety := v_session_anxiety;
    END IF;
    IF v_sleep = 0 AND v_session_sleep IS NOT NULL THEN
      v_sleep := v_session_sleep;
    END IF;
    IF v_energy = 0 AND v_session_energy IS NOT NULL THEN
      v_energy := v_session_energy;
    END IF;
  END IF;

  -- Get today's emotions (merge all records for the day)
  SELECT 
    MAX(joy) as joy,
    MAX(sadness) as sadness,
    MAX(anger) as anger,
    MAX(fear) as fear,
    MAX(apathy) as apathy,
    MAX(shame) as shame,
    MAX(jealousy) as jealousy,
    MAX(hope) as hope,
    MAX(frustration) as frustration,
    MAX(nostalgia) as nostalgia,
    MAX(nervousness) as nervousness,
    MAX(overwhelm) as overwhelm,
    MAX(excitement) as excitement,
    MAX(disappointment) as disappointment
  INTO v_emotions
  FROM daily_emotions
  WHERE user_id = p_user_id AND date = p_date;
  
  IF v_emotions.joy IS NOT NULL OR v_emotions.sadness IS NOT NULL OR 
     v_emotions.anger IS NOT NULL OR v_emotions.fear IS NOT NULL OR 
     v_emotions.apathy IS NOT NULL THEN
    v_has_emotions := true;
  END IF;

  -- Get today's life areas (MERGE ALL records for the day using MAX to get non-null values)
  SELECT 
    MAX(work) as work,
    MAX(school) as school,
    MAX(love) as love,
    MAX(social) as social,
    MAX(health) as health,
    MAX(growth) as growth
  INTO v_la_work, v_la_school, v_la_love, v_la_social, v_la_health, v_la_growth
  FROM daily_life_areas
  WHERE user_id = p_user_id AND date = p_date;
  
  IF v_la_work IS NOT NULL OR v_la_school IS NOT NULL OR v_la_love IS NOT NULL OR 
     v_la_social IS NOT NULL OR v_la_health IS NOT NULL OR v_la_growth IS NOT NULL THEN
    v_has_life_areas := true;
  END IF;

  -- Get today's psychology (merge all records)
  SELECT 
    MAX(rumination) as rumination,
    MAX(self_efficacy) as self_efficacy,
    MAX(mental_clarity) as mental_clarity,
    MAX(concentration) as concentration,
    MAX(burnout_level) as burnout_level,
    MAX(coping_ability) as coping_ability,
    MAX(loneliness_perceived) as loneliness_perceived,
    MAX(somatic_tension) as somatic_tension,
    MAX(appetite_changes) as appetite_changes,
    MAX(sunlight_exposure) as sunlight_exposure,
    MAX(guilt) as guilt,
    MAX(gratitude) as gratitude,
    MAX(irritability) as irritability,
    MAX(motivation) as motivation,
    MAX(intrusive_thoughts) as intrusive_thoughts,
    MAX(self_worth) as self_worth
  INTO v_psychology
  FROM daily_psychology
  WHERE user_id = p_user_id AND date = p_date;
  
  IF v_psychology.rumination IS NOT NULL OR v_psychology.burnout_level IS NOT NULL OR
     v_psychology.mental_clarity IS NOT NULL THEN
    v_has_psychology := true;
  END IF;

  -- Build result JSON
  result := json_build_object(
    'date', p_date,
    'vitals', json_build_object(
      'mood', COALESCE(v_mood, 0),
      'anxiety', COALESCE(v_anxiety, 0),
      'energy', COALESCE(v_energy, 0),
      'sleep', COALESCE(v_sleep, 0)
    ),
    'emotions', json_build_object(
      'joy', COALESCE(v_emotions.joy, 0),
      'sadness', COALESCE(v_emotions.sadness, 0),
      'anger', COALESCE(v_emotions.anger, 0),
      'fear', COALESCE(v_emotions.fear, 0),
      'apathy', COALESCE(v_emotions.apathy, 0),
      'shame', v_emotions.shame,
      'jealousy', v_emotions.jealousy,
      'hope', v_emotions.hope,
      'frustration', v_emotions.frustration,
      'nostalgia', v_emotions.nostalgia,
      'nervousness', v_emotions.nervousness,
      'overwhelm', v_emotions.overwhelm,
      'excitement', v_emotions.excitement,
      'disappointment', v_emotions.disappointment
    ),
    'life_areas', json_build_object(
      'love', v_la_love,
      'work', v_la_work,
      'school', v_la_school,
      'health', v_la_health,
      'social', v_la_social,
      'growth', v_la_growth
    ),
    'deep_psychology', json_build_object(
      'rumination', v_psychology.rumination,
      'self_efficacy', v_psychology.self_efficacy,
      'mental_clarity', v_psychology.mental_clarity,
      'concentration', v_psychology.concentration,
      'burnout_level', v_psychology.burnout_level,
      'coping_ability', v_psychology.coping_ability,
      'loneliness_perceived', v_psychology.loneliness_perceived,
      'somatic_tension', v_psychology.somatic_tension,
      'appetite_changes', v_psychology.appetite_changes,
      'sunlight_exposure', v_psychology.sunlight_exposure,
      'guilt', v_psychology.guilt,
      'gratitude', v_psychology.gratitude,
      'irritability', v_psychology.irritability,
      'motivation', v_psychology.motivation,
      'intrusive_thoughts', v_psychology.intrusive_thoughts,
      'self_worth', v_psychology.self_worth
    ),
    'has_checkin', v_has_checkin,
    'has_sessions', v_has_sessions,
    'has_emotions', v_has_emotions,
    'has_life_areas', v_has_life_areas,
    'has_psychology', v_has_psychology,
    'checkin_priority', v_checkin_priority
  );

  RETURN result;
END;
$$;
-- ============================================================
-- Migration: 20260204021340_00c3a77b-25d1-4316-a7e3-ef14db96896e.sql
-- ============================================================
-- ═══════════════════════════════════════════════════════════════
-- FASE 2: Aggiunta Nuove Metriche Cliniche (~25 nuove colonne)
-- ═══════════════════════════════════════════════════════════════

-- === DAILY_EMOTIONS: Aggiunta 6 emozioni mancanti ===
ALTER TABLE public.daily_emotions
ADD COLUMN IF NOT EXISTS disgust integer,
ADD COLUMN IF NOT EXISTS surprise integer,
ADD COLUMN IF NOT EXISTS serenity integer,
ADD COLUMN IF NOT EXISTS pride integer,
ADD COLUMN IF NOT EXISTS affection integer,
ADD COLUMN IF NOT EXISTS curiosity integer;

-- === DAILY_PSYCHOLOGY: Aggiunta indicatori di sicurezza (CRITICI) ===
ALTER TABLE public.daily_psychology
ADD COLUMN IF NOT EXISTS suicidal_ideation integer,
ADD COLUMN IF NOT EXISTS hopelessness integer,
ADD COLUMN IF NOT EXISTS self_harm_urges integer;

-- === DAILY_PSYCHOLOGY: Aggiunta metriche cognitive ===
ALTER TABLE public.daily_psychology
ADD COLUMN IF NOT EXISTS dissociation integer,
ADD COLUMN IF NOT EXISTS confusion integer,
ADD COLUMN IF NOT EXISTS racing_thoughts integer;

-- === DAILY_PSYCHOLOGY: Aggiunta metriche comportamentali ===
ALTER TABLE public.daily_psychology
ADD COLUMN IF NOT EXISTS avoidance integer,
ADD COLUMN IF NOT EXISTS social_withdrawal integer,
ADD COLUMN IF NOT EXISTS compulsive_urges integer,
ADD COLUMN IF NOT EXISTS procrastination integer;

-- === DAILY_PSYCHOLOGY: Aggiunta risorse personali ===
ALTER TABLE public.daily_psychology
ADD COLUMN IF NOT EXISTS sense_of_purpose integer,
ADD COLUMN IF NOT EXISTS life_satisfaction integer,
ADD COLUMN IF NOT EXISTS perceived_social_support integer,
ADD COLUMN IF NOT EXISTS emotional_regulation integer,
ADD COLUMN IF NOT EXISTS resilience integer,
ADD COLUMN IF NOT EXISTS mindfulness integer;

-- === DAILY_LIFE_AREAS: Aggiunta 3 nuove aree ===
ALTER TABLE public.daily_life_areas
ADD COLUMN IF NOT EXISTS family integer,
ADD COLUMN IF NOT EXISTS leisure integer,
ADD COLUMN IF NOT EXISTS finances integer;

-- === Commenti per documentazione clinica ===
COMMENT ON COLUMN public.daily_psychology.suicidal_ideation IS 'CRITICO: Pensieri suicidari (1-10). Alert se > 5';
COMMENT ON COLUMN public.daily_psychology.hopelessness IS 'CRITICO: Disperazione (1-10). Alert se > 7';
COMMENT ON COLUMN public.daily_psychology.self_harm_urges IS 'CRITICO: Impulsi autolesionistici (1-10). Alert se > 5';
COMMENT ON COLUMN public.daily_psychology.dissociation IS 'Dissociazione - importante per trauma';
COMMENT ON COLUMN public.daily_psychology.avoidance IS 'Evitamento - core dell''ansia';
COMMENT ON COLUMN public.daily_life_areas.family IS 'Relazioni familiari - distinto da amore romantico';
COMMENT ON COLUMN public.daily_life_areas.leisure IS 'Tempo libero - importante per burnout';
COMMENT ON COLUMN public.daily_life_areas.finances IS 'Situazione economica - fonte di stress';
-- ============================================================
-- Migration: 20260204021617_a24b463d-0624-4a7c-82bd-21b0d9a9ea1b.sql
-- ============================================================
-- Aggiorna la funzione get_daily_metrics per includere le nuove metriche
CREATE OR REPLACE FUNCTION public.get_daily_metrics(p_user_id uuid, p_date date DEFAULT CURRENT_DATE)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result json;
  v_checkin record;
  v_session_count integer;
  v_session_mood numeric;
  v_session_anxiety numeric;
  v_session_sleep numeric;
  v_session_energy numeric;
  v_emotions record;
  v_life_areas record;
  v_psychology record;
  v_mood numeric := 0;
  v_anxiety numeric := 0;
  v_energy numeric := 0;
  v_sleep numeric := 0;
  v_has_checkin boolean := false;
  v_has_sessions boolean := false;
  v_has_emotions boolean := false;
  v_has_life_areas boolean := false;
  v_has_psychology boolean := false;
  v_checkin_priority boolean := false;
  -- Life areas aggregated
  v_la_work integer;
  v_la_school integer;
  v_la_love integer;
  v_la_family integer;
  v_la_social integer;
  v_la_health integer;
  v_la_growth integer;
  v_la_leisure integer;
  v_la_finances integer;
BEGIN
  -- Get today's checkin (most recent)
  SELECT * INTO v_checkin FROM daily_checkins
  WHERE user_id = p_user_id
    AND DATE(created_at AT TIME ZONE 'Europe/Rome') = p_date
  ORDER BY created_at DESC
  LIMIT 1;

  -- Get today's completed sessions (including energy)
  SELECT 
    COUNT(*),
    AVG(mood_score_detected) FILTER (WHERE mood_score_detected > 0),
    AVG(anxiety_score_detected) FILTER (WHERE anxiety_score_detected > 0),
    AVG(sleep_quality) FILTER (WHERE sleep_quality > 0),
    AVG(energy_score_detected) FILTER (WHERE energy_score_detected > 0)
  INTO v_session_count, v_session_mood, v_session_anxiety, v_session_sleep, v_session_energy
  FROM sessions
  WHERE user_id = p_user_id
    AND DATE(start_time AT TIME ZONE 'Europe/Rome') = p_date
    AND status = 'completed';

  -- Check if we have checkin data
  IF v_checkin IS NOT NULL THEN
    v_has_checkin := true;
    IF v_checkin.mood_value > 0 THEN
      v_mood := v_checkin.mood_value * 2;
      v_checkin_priority := true;
    END IF;
    
    IF v_checkin.notes IS NOT NULL THEN
      BEGIN
        v_anxiety := COALESCE((v_checkin.notes::json->>'anxiety')::numeric, 0);
        v_energy := COALESCE((v_checkin.notes::json->>'energy')::numeric, 0);
        v_sleep := COALESCE((v_checkin.notes::json->>'sleep')::numeric, 0);
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;
  END IF;

  -- Session data processing
  IF v_session_count > 0 THEN
    v_has_sessions := true;
    IF v_mood = 0 AND v_session_mood IS NOT NULL THEN
      v_mood := v_session_mood;
    END IF;
    IF v_anxiety = 0 AND v_session_anxiety IS NOT NULL THEN
      v_anxiety := v_session_anxiety;
    END IF;
    IF v_sleep = 0 AND v_session_sleep IS NOT NULL THEN
      v_sleep := v_session_sleep;
    END IF;
    IF v_energy = 0 AND v_session_energy IS NOT NULL THEN
      v_energy := v_session_energy;
    END IF;
  END IF;

  -- Get today's emotions (merge all records for the day) - EXTENDED with 6 new emotions
  SELECT 
    MAX(joy) as joy,
    MAX(sadness) as sadness,
    MAX(anger) as anger,
    MAX(fear) as fear,
    MAX(apathy) as apathy,
    MAX(shame) as shame,
    MAX(jealousy) as jealousy,
    MAX(hope) as hope,
    MAX(frustration) as frustration,
    MAX(nostalgia) as nostalgia,
    MAX(nervousness) as nervousness,
    MAX(overwhelm) as overwhelm,
    MAX(excitement) as excitement,
    MAX(disappointment) as disappointment,
    -- NEW emotions
    MAX(disgust) as disgust,
    MAX(surprise) as surprise,
    MAX(serenity) as serenity,
    MAX(pride) as pride,
    MAX(affection) as affection,
    MAX(curiosity) as curiosity
  INTO v_emotions
  FROM daily_emotions
  WHERE user_id = p_user_id AND date = p_date;
  
  IF v_emotions.joy IS NOT NULL OR v_emotions.sadness IS NOT NULL OR 
     v_emotions.anger IS NOT NULL OR v_emotions.fear IS NOT NULL OR 
     v_emotions.apathy IS NOT NULL THEN
    v_has_emotions := true;
  END IF;

  -- Get today's life areas (MERGE ALL records) - EXTENDED with 3 new areas
  SELECT 
    MAX(work) as work,
    MAX(school) as school,
    MAX(love) as love,
    MAX(family) as family,
    MAX(social) as social,
    MAX(health) as health,
    MAX(growth) as growth,
    MAX(leisure) as leisure,
    MAX(finances) as finances
  INTO v_la_work, v_la_school, v_la_love, v_la_family, v_la_social, v_la_health, v_la_growth, v_la_leisure, v_la_finances
  FROM daily_life_areas
  WHERE user_id = p_user_id AND date = p_date;
  
  IF v_la_work IS NOT NULL OR v_la_school IS NOT NULL OR v_la_love IS NOT NULL OR 
     v_la_social IS NOT NULL OR v_la_health IS NOT NULL OR v_la_growth IS NOT NULL OR
     v_la_family IS NOT NULL OR v_la_leisure IS NOT NULL OR v_la_finances IS NOT NULL THEN
    v_has_life_areas := true;
  END IF;

  -- Get today's psychology (merge all records) - EXTENDED with ~18 new metrics
  SELECT 
    MAX(rumination) as rumination,
    MAX(self_efficacy) as self_efficacy,
    MAX(mental_clarity) as mental_clarity,
    MAX(concentration) as concentration,
    MAX(burnout_level) as burnout_level,
    MAX(coping_ability) as coping_ability,
    MAX(loneliness_perceived) as loneliness_perceived,
    MAX(somatic_tension) as somatic_tension,
    MAX(appetite_changes) as appetite_changes,
    MAX(sunlight_exposure) as sunlight_exposure,
    MAX(guilt) as guilt,
    MAX(gratitude) as gratitude,
    MAX(irritability) as irritability,
    MAX(motivation) as motivation,
    MAX(intrusive_thoughts) as intrusive_thoughts,
    MAX(self_worth) as self_worth,
    -- NEW: Safety indicators
    MAX(suicidal_ideation) as suicidal_ideation,
    MAX(hopelessness) as hopelessness,
    MAX(self_harm_urges) as self_harm_urges,
    -- NEW: Cognitive
    MAX(dissociation) as dissociation,
    MAX(confusion) as confusion,
    MAX(racing_thoughts) as racing_thoughts,
    -- NEW: Behavioral
    MAX(avoidance) as avoidance,
    MAX(social_withdrawal) as social_withdrawal,
    MAX(compulsive_urges) as compulsive_urges,
    MAX(procrastination) as procrastination,
    -- NEW: Resources
    MAX(sense_of_purpose) as sense_of_purpose,
    MAX(life_satisfaction) as life_satisfaction,
    MAX(perceived_social_support) as perceived_social_support,
    MAX(emotional_regulation) as emotional_regulation,
    MAX(resilience) as resilience,
    MAX(mindfulness) as mindfulness
  INTO v_psychology
  FROM daily_psychology
  WHERE user_id = p_user_id AND date = p_date;
  
  IF v_psychology.rumination IS NOT NULL OR v_psychology.burnout_level IS NOT NULL OR
     v_psychology.mental_clarity IS NOT NULL THEN
    v_has_psychology := true;
  END IF;

  -- Build result JSON with all extended metrics
  result := json_build_object(
    'date', p_date,
    'vitals', json_build_object(
      'mood', COALESCE(v_mood, 0),
      'anxiety', COALESCE(v_anxiety, 0),
      'energy', COALESCE(v_energy, 0),
      'sleep', COALESCE(v_sleep, 0)
    ),
    'emotions', json_build_object(
      'joy', COALESCE(v_emotions.joy, 0),
      'sadness', COALESCE(v_emotions.sadness, 0),
      'anger', COALESCE(v_emotions.anger, 0),
      'fear', COALESCE(v_emotions.fear, 0),
      'apathy', COALESCE(v_emotions.apathy, 0),
      'shame', v_emotions.shame,
      'jealousy', v_emotions.jealousy,
      'hope', v_emotions.hope,
      'frustration', v_emotions.frustration,
      'nostalgia', v_emotions.nostalgia,
      'nervousness', v_emotions.nervousness,
      'overwhelm', v_emotions.overwhelm,
      'excitement', v_emotions.excitement,
      'disappointment', v_emotions.disappointment,
      -- NEW emotions
      'disgust', v_emotions.disgust,
      'surprise', v_emotions.surprise,
      'serenity', v_emotions.serenity,
      'pride', v_emotions.pride,
      'affection', v_emotions.affection,
      'curiosity', v_emotions.curiosity
    ),
    'life_areas', json_build_object(
      'love', v_la_love,
      'work', v_la_work,
      'school', v_la_school,
      'family', v_la_family,
      'health', v_la_health,
      'social', v_la_social,
      'growth', v_la_growth,
      'leisure', v_la_leisure,
      'finances', v_la_finances
    ),
    'deep_psychology', json_build_object(
      'rumination', v_psychology.rumination,
      'self_efficacy', v_psychology.self_efficacy,
      'mental_clarity', v_psychology.mental_clarity,
      'concentration', v_psychology.concentration,
      'burnout_level', v_psychology.burnout_level,
      'coping_ability', v_psychology.coping_ability,
      'loneliness_perceived', v_psychology.loneliness_perceived,
      'somatic_tension', v_psychology.somatic_tension,
      'appetite_changes', v_psychology.appetite_changes,
      'sunlight_exposure', v_psychology.sunlight_exposure,
      'guilt', v_psychology.guilt,
      'gratitude', v_psychology.gratitude,
      'irritability', v_psychology.irritability,
      'motivation', v_psychology.motivation,
      'intrusive_thoughts', v_psychology.intrusive_thoughts,
      'self_worth', v_psychology.self_worth,
      -- NEW: Safety
      'suicidal_ideation', v_psychology.suicidal_ideation,
      'hopelessness', v_psychology.hopelessness,
      'self_harm_urges', v_psychology.self_harm_urges,
      -- NEW: Cognitive
      'dissociation', v_psychology.dissociation,
      'confusion', v_psychology.confusion,
      'racing_thoughts', v_psychology.racing_thoughts,
      -- NEW: Behavioral
      'avoidance', v_psychology.avoidance,
      'social_withdrawal', v_psychology.social_withdrawal,
      'compulsive_urges', v_psychology.compulsive_urges,
      'procrastination', v_psychology.procrastination,
      -- NEW: Resources
      'sense_of_purpose', v_psychology.sense_of_purpose,
      'life_satisfaction', v_psychology.life_satisfaction,
      'perceived_social_support', v_psychology.perceived_social_support,
      'emotional_regulation', v_psychology.emotional_regulation,
      'resilience', v_psychology.resilience,
      'mindfulness', v_psychology.mindfulness
    ),
    'has_checkin', v_has_checkin,
    'has_sessions', v_has_sessions,
    'has_emotions', v_has_emotions,
    'has_life_areas', v_has_life_areas,
    'has_psychology', v_has_psychology,
    'checkin_priority', v_checkin_priority
  );

  RETURN result;
END;
$function$;
-- ============================================================
-- Migration: 20260204023046_590623ac-9547-4774-ac8b-29d40ade2612.sql
-- ============================================================
-- Update get_daily_metrics to also check life_balance_scores.energy as fallback
CREATE OR REPLACE FUNCTION public.get_daily_metrics(p_user_id uuid, p_date date DEFAULT CURRENT_DATE)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result json;
  v_checkin record;
  v_session_count integer;
  v_session_mood numeric;
  v_session_anxiety numeric;
  v_session_sleep numeric;
  v_session_energy numeric;
  v_session_energy_lbs numeric; -- NEW: energy from life_balance_scores
  v_emotions record;
  v_life_areas record;
  v_psychology record;
  v_mood numeric := 0;
  v_anxiety numeric := 0;
  v_energy numeric := 0;
  v_sleep numeric := 0;
  v_has_checkin boolean := false;
  v_has_sessions boolean := false;
  v_has_emotions boolean := false;
  v_has_life_areas boolean := false;
  v_has_psychology boolean := false;
  v_checkin_priority boolean := false;
  -- Life areas aggregated
  v_la_work integer;
  v_la_school integer;
  v_la_love integer;
  v_la_family integer;
  v_la_social integer;
  v_la_health integer;
  v_la_growth integer;
  v_la_leisure integer;
  v_la_finances integer;
BEGIN
  -- Get today's checkin (most recent)
  SELECT * INTO v_checkin FROM daily_checkins
  WHERE user_id = p_user_id
    AND DATE(created_at AT TIME ZONE 'Europe/Rome') = p_date
  ORDER BY created_at DESC
  LIMIT 1;

  -- Get today's completed sessions (including energy from both columns)
  SELECT 
    COUNT(*),
    AVG(mood_score_detected) FILTER (WHERE mood_score_detected > 0),
    AVG(anxiety_score_detected) FILTER (WHERE anxiety_score_detected > 0),
    AVG(sleep_quality) FILTER (WHERE sleep_quality > 0),
    AVG(energy_score_detected) FILTER (WHERE energy_score_detected > 0),
    -- NEW: Also get energy from life_balance_scores
    AVG((life_balance_scores->>'energy')::numeric) FILTER (WHERE (life_balance_scores->>'energy')::numeric > 0)
  INTO v_session_count, v_session_mood, v_session_anxiety, v_session_sleep, v_session_energy, v_session_energy_lbs
  FROM sessions
  WHERE user_id = p_user_id
    AND DATE(start_time AT TIME ZONE 'Europe/Rome') = p_date
    AND status = 'completed';

  -- Check if we have checkin data
  IF v_checkin IS NOT NULL THEN
    v_has_checkin := true;
    IF v_checkin.mood_value > 0 THEN
      v_mood := v_checkin.mood_value * 2;
      v_checkin_priority := true;
    END IF;
    
    IF v_checkin.notes IS NOT NULL THEN
      BEGIN
        v_anxiety := COALESCE((v_checkin.notes::json->>'anxiety')::numeric, 0);
        v_energy := COALESCE((v_checkin.notes::json->>'energy')::numeric, 0);
        v_sleep := COALESCE((v_checkin.notes::json->>'sleep')::numeric, 0);
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;
  END IF;

  -- Session data processing
  IF v_session_count > 0 THEN
    v_has_sessions := true;
    IF v_mood = 0 AND v_session_mood IS NOT NULL THEN
      v_mood := v_session_mood;
    END IF;
    IF v_anxiety = 0 AND v_session_anxiety IS NOT NULL THEN
      v_anxiety := v_session_anxiety;
    END IF;
    IF v_sleep = 0 AND v_session_sleep IS NOT NULL THEN
      v_sleep := v_session_sleep;
    END IF;
    -- Energy: check both energy_score_detected AND life_balance_scores.energy
    IF v_energy = 0 THEN
      IF v_session_energy IS NOT NULL THEN
        v_energy := v_session_energy;
      ELSIF v_session_energy_lbs IS NOT NULL THEN
        v_energy := v_session_energy_lbs;
      END IF;
    END IF;
  END IF;

  -- Get today's emotions (merge all records for the day) - EXTENDED with 6 new emotions
  SELECT 
    MAX(joy) as joy,
    MAX(sadness) as sadness,
    MAX(anger) as anger,
    MAX(fear) as fear,
    MAX(apathy) as apathy,
    MAX(shame) as shame,
    MAX(jealousy) as jealousy,
    MAX(hope) as hope,
    MAX(frustration) as frustration,
    MAX(nostalgia) as nostalgia,
    MAX(nervousness) as nervousness,
    MAX(overwhelm) as overwhelm,
    MAX(excitement) as excitement,
    MAX(disappointment) as disappointment,
    -- NEW emotions
    MAX(disgust) as disgust,
    MAX(surprise) as surprise,
    MAX(serenity) as serenity,
    MAX(pride) as pride,
    MAX(affection) as affection,
    MAX(curiosity) as curiosity
  INTO v_emotions
  FROM daily_emotions
  WHERE user_id = p_user_id AND date = p_date;
  
  IF v_emotions.joy IS NOT NULL OR v_emotions.sadness IS NOT NULL OR 
     v_emotions.anger IS NOT NULL OR v_emotions.fear IS NOT NULL OR 
     v_emotions.apathy IS NOT NULL THEN
    v_has_emotions := true;
  END IF;

  -- Get today's life areas (MERGE ALL records) - EXTENDED with 3 new areas
  SELECT 
    MAX(work) as work,
    MAX(school) as school,
    MAX(love) as love,
    MAX(family) as family,
    MAX(social) as social,
    MAX(health) as health,
    MAX(growth) as growth,
    MAX(leisure) as leisure,
    MAX(finances) as finances
  INTO v_la_work, v_la_school, v_la_love, v_la_family, v_la_social, v_la_health, v_la_growth, v_la_leisure, v_la_finances
  FROM daily_life_areas
  WHERE user_id = p_user_id AND date = p_date;
  
  IF v_la_work IS NOT NULL OR v_la_school IS NOT NULL OR v_la_love IS NOT NULL OR 
     v_la_social IS NOT NULL OR v_la_health IS NOT NULL OR v_la_growth IS NOT NULL OR
     v_la_family IS NOT NULL OR v_la_leisure IS NOT NULL OR v_la_finances IS NOT NULL THEN
    v_has_life_areas := true;
  END IF;

  -- Get today's psychology (merge all records) - EXTENDED with ~18 new metrics
  SELECT 
    MAX(rumination) as rumination,
    MAX(self_efficacy) as self_efficacy,
    MAX(mental_clarity) as mental_clarity,
    MAX(concentration) as concentration,
    MAX(burnout_level) as burnout_level,
    MAX(coping_ability) as coping_ability,
    MAX(loneliness_perceived) as loneliness_perceived,
    MAX(somatic_tension) as somatic_tension,
    MAX(appetite_changes) as appetite_changes,
    MAX(sunlight_exposure) as sunlight_exposure,
    MAX(guilt) as guilt,
    MAX(gratitude) as gratitude,
    MAX(irritability) as irritability,
    MAX(motivation) as motivation,
    MAX(intrusive_thoughts) as intrusive_thoughts,
    MAX(self_worth) as self_worth,
    -- NEW: Safety indicators
    MAX(suicidal_ideation) as suicidal_ideation,
    MAX(hopelessness) as hopelessness,
    MAX(self_harm_urges) as self_harm_urges,
    -- NEW: Cognitive
    MAX(dissociation) as dissociation,
    MAX(confusion) as confusion,
    MAX(racing_thoughts) as racing_thoughts,
    -- NEW: Behavioral
    MAX(avoidance) as avoidance,
    MAX(social_withdrawal) as social_withdrawal,
    MAX(compulsive_urges) as compulsive_urges,
    MAX(procrastination) as procrastination,
    -- NEW: Resources
    MAX(sense_of_purpose) as sense_of_purpose,
    MAX(life_satisfaction) as life_satisfaction,
    MAX(perceived_social_support) as perceived_social_support,
    MAX(emotional_regulation) as emotional_regulation,
    MAX(resilience) as resilience,
    MAX(mindfulness) as mindfulness
  INTO v_psychology
  FROM daily_psychology
  WHERE user_id = p_user_id AND date = p_date;
  
  IF v_psychology.rumination IS NOT NULL OR v_psychology.burnout_level IS NOT NULL OR
     v_psychology.mental_clarity IS NOT NULL THEN
    v_has_psychology := true;
  END IF;

  -- Build result JSON with all extended metrics
  result := json_build_object(
    'date', p_date,
    'vitals', json_build_object(
      'mood', COALESCE(v_mood, 0),
      'anxiety', COALESCE(v_anxiety, 0),
      'energy', COALESCE(v_energy, 0),
      'sleep', COALESCE(v_sleep, 0)
    ),
    'emotions', json_build_object(
      'joy', COALESCE(v_emotions.joy, 0),
      'sadness', COALESCE(v_emotions.sadness, 0),
      'anger', COALESCE(v_emotions.anger, 0),
      'fear', COALESCE(v_emotions.fear, 0),
      'apathy', COALESCE(v_emotions.apathy, 0),
      'shame', v_emotions.shame,
      'jealousy', v_emotions.jealousy,
      'hope', v_emotions.hope,
      'frustration', v_emotions.frustration,
      'nostalgia', v_emotions.nostalgia,
      'nervousness', v_emotions.nervousness,
      'overwhelm', v_emotions.overwhelm,
      'excitement', v_emotions.excitement,
      'disappointment', v_emotions.disappointment,
      -- NEW emotions
      'disgust', v_emotions.disgust,
      'surprise', v_emotions.surprise,
      'serenity', v_emotions.serenity,
      'pride', v_emotions.pride,
      'affection', v_emotions.affection,
      'curiosity', v_emotions.curiosity
    ),
    'life_areas', json_build_object(
      'love', v_la_love,
      'work', v_la_work,
      'school', v_la_school,
      'family', v_la_family,
      'health', v_la_health,
      'social', v_la_social,
      'growth', v_la_growth,
      'leisure', v_la_leisure,
      'finances', v_la_finances
    ),
    'deep_psychology', json_build_object(
      'rumination', v_psychology.rumination,
      'self_efficacy', v_psychology.self_efficacy,
      'mental_clarity', v_psychology.mental_clarity,
      'concentration', v_psychology.concentration,
      'burnout_level', v_psychology.burnout_level,
      'coping_ability', v_psychology.coping_ability,
      'loneliness_perceived', v_psychology.loneliness_perceived,
      'somatic_tension', v_psychology.somatic_tension,
      'appetite_changes', v_psychology.appetite_changes,
      'sunlight_exposure', v_psychology.sunlight_exposure,
      'guilt', v_psychology.guilt,
      'gratitude', v_psychology.gratitude,
      'irritability', v_psychology.irritability,
      'motivation', v_psychology.motivation,
      'intrusive_thoughts', v_psychology.intrusive_thoughts,
      'self_worth', v_psychology.self_worth,
      -- NEW: Safety
      'suicidal_ideation', v_psychology.suicidal_ideation,
      'hopelessness', v_psychology.hopelessness,
      'self_harm_urges', v_psychology.self_harm_urges,
      -- NEW: Cognitive
      'dissociation', v_psychology.dissociation,
      'confusion', v_psychology.confusion,
      'racing_thoughts', v_psychology.racing_thoughts,
      -- NEW: Behavioral
      'avoidance', v_psychology.avoidance,
      'social_withdrawal', v_psychology.social_withdrawal,
      'compulsive_urges', v_psychology.compulsive_urges,
      'procrastination', v_psychology.procrastination,
      -- NEW: Resources
      'sense_of_purpose', v_psychology.sense_of_purpose,
      'life_satisfaction', v_psychology.life_satisfaction,
      'perceived_social_support', v_psychology.perceived_social_support,
      'emotional_regulation', v_psychology.emotional_regulation,
      'resilience', v_psychology.resilience,
      'mindfulness', v_psychology.mindfulness
    ),
    'has_checkin', v_has_checkin,
    'has_sessions', v_has_sessions,
    'has_emotions', v_has_emotions,
    'has_life_areas', v_has_life_areas,
    'has_psychology', v_has_psychology,
    'checkin_priority', v_checkin_priority
  );

  RETURN result;
END;
$function$;
-- ============================================================
-- Migration: 20260208172937_3e959ef1-b5e0-4947-9915-6f32e9f5d89e.sql
-- ============================================================
-- Create user_events table for structured future events
CREATE TABLE public.user_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  
  -- Event details
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'generic', -- viaggio, appuntamento, evento, lavoro, salute, sociale, etc.
  location TEXT, -- "Ibiza", "dal medico", "in ufficio"
  
  -- Temporal data
  event_date DATE NOT NULL,
  event_time TIME, -- NULL if no specific time (e.g., "ad agosto")
  end_date DATE, -- For multi-day events (vacations)
  end_time TIME,
  is_all_day BOOLEAN DEFAULT false,
  
  -- Source tracking
  source_session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  extracted_from_text TEXT, -- Original phrase: "alle 15 ho il medico"
  
  -- Follow-up tracking
  status TEXT DEFAULT 'upcoming', -- upcoming, happening, passed, followed_up, cancelled
  follow_up_done BOOLEAN DEFAULT false,
  follow_up_at TIMESTAMP WITH TIME ZONE,
  follow_up_session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  
  -- Recurrence (for future use)
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT, -- 'daily', 'weekly', 'monthly', etc.
  
  -- Reminder settings (for future notifications)
  reminder_enabled BOOLEAN DEFAULT false,
  reminder_minutes_before INTEGER DEFAULT 30,
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own events"
  ON public.user_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own events"
  ON public.user_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own events"
  ON public.user_events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own events"
  ON public.user_events FOR DELETE
  USING (auth.uid() = user_id);

-- Doctors can view patient events
CREATE POLICY "Doctors can view patient events"
  ON public.user_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM doctor_patient_access
      WHERE doctor_patient_access.patient_id = user_events.user_id
        AND doctor_patient_access.doctor_id = auth.uid()
        AND doctor_patient_access.is_active = true
    )
  );

-- Create indexes for efficient queries
CREATE INDEX idx_user_events_user_date ON public.user_events(user_id, event_date);
CREATE INDEX idx_user_events_status ON public.user_events(user_id, status);
CREATE INDEX idx_user_events_upcoming ON public.user_events(user_id, event_date) WHERE status = 'upcoming';

-- Trigger for updated_at
CREATE TRIGGER update_user_events_updated_at
  BEFORE UPDATE ON public.user_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_daily_tables_timestamp();

-- Add comment for documentation
COMMENT ON TABLE public.user_events IS 'Structured storage for user future events with date/time, extracted from conversations by AI';
-- ============================================================
-- Migration: 20260208204800_dca6bb29-9009-4adf-a450-a502b1ff03dc.sql
-- ============================================================
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
-- ============================================================
-- Migration: 20260224005217_d81033b8-f1be-485e-99cc-6e0749e156ae.sql
-- ============================================================

-- Table to store iOS device push tokens
CREATE TABLE public.device_push_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  device_token TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'ios',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, device_token)
);

ALTER TABLE public.device_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tokens" ON public.device_push_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own tokens" ON public.device_push_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tokens" ON public.device_push_tokens FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tokens" ON public.device_push_tokens FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- Migration: 20260224225149_bc824c9d-91c8-42b5-bd43-00dfd711be70.sql
-- ============================================================

-- Knowledge Base per Aria: documenti clinici e psicologici organizzati per topic
CREATE TABLE public.aria_knowledge_base (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic TEXT NOT NULL,           -- es. 'anxiety', 'depression', 'cbt_techniques'
  category TEXT NOT NULL,        -- es. 'clinical', 'techniques', 'pharmacology', 'conversational'
  title TEXT NOT NULL,           -- titolo leggibile
  content TEXT NOT NULL,         -- contenuto Markdown completo
  keywords TEXT[] DEFAULT '{}',  -- parole chiave per matching
  priority INTEGER DEFAULT 5,   -- 1-10, per ordinare i risultati
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index per ricerca rapida per topic e category
CREATE INDEX idx_kb_topic ON public.aria_knowledge_base(topic);
CREATE INDEX idx_kb_category ON public.aria_knowledge_base(category);
CREATE INDEX idx_kb_keywords ON public.aria_knowledge_base USING GIN(keywords);

-- RLS: lettura pubblica (usata dalle edge functions con service_role), nessun accesso utente diretto
ALTER TABLE public.aria_knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access"
  ON public.aria_knowledge_base
  FOR ALL
  USING (true)
  WITH CHECK (true);

SET session_replication_role = DEFAULT;
