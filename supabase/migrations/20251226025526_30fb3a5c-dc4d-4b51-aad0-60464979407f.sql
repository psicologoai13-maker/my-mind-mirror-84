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