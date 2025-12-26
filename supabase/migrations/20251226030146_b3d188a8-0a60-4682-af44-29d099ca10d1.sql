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