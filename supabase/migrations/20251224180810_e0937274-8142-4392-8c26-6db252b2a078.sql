-- Add long_term_memory column to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS long_term_memory text[] DEFAULT '{}'::text[];