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