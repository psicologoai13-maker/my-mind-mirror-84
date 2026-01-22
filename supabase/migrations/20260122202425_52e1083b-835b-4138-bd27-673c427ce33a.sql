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