-- Add onboarding fields to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_answers jsonb DEFAULT '{}'::jsonb;