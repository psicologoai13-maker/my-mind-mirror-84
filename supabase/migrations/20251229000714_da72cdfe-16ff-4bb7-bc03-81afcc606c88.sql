-- Add active_dashboard_metrics column to user_profiles for personalized dashboard
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS active_dashboard_metrics text[] DEFAULT ARRAY['mood', 'anxiety', 'energy', 'sleep'];