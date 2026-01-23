-- Add dashboard_config JSONB column for personalized dashboard configuration
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS dashboard_config JSONB DEFAULT '{
  "priority_metrics": ["mood", "anxiety", "energy", "sleep"],
  "secondary_metrics": [],
  "hidden_metrics": [],
  "theme": "default"
}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.user_profiles.dashboard_config IS 'Personalized dashboard configuration based on onboarding answers. Contains priority_metrics, secondary_metrics, hidden_metrics arrays.';