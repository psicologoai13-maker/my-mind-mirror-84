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