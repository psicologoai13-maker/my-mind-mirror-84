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