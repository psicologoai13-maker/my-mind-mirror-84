-- Add selected_goals column to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN selected_goals text[] DEFAULT '{}'::text[];