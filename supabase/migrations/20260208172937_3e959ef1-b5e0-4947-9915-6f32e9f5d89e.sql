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