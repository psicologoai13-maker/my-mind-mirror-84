
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
