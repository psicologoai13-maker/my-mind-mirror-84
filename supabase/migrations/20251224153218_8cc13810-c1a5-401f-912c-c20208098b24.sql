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