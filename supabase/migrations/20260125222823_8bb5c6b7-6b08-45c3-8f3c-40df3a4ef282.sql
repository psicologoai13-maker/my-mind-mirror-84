-- Add AI cache columns to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS ai_dashboard_cache jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ai_analysis_cache jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ai_insights_cache jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ai_cache_updated_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_data_change_at timestamp with time zone DEFAULT now();

-- Create function to update last_data_change_at on user_profiles
CREATE OR REPLACE FUNCTION public.update_user_data_change_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.user_profiles 
  SET last_data_change_at = now()
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for all data tables
DROP TRIGGER IF EXISTS trigger_checkin_data_change ON public.daily_checkins;
CREATE TRIGGER trigger_checkin_data_change
AFTER INSERT OR UPDATE ON public.daily_checkins
FOR EACH ROW EXECUTE FUNCTION public.update_user_data_change_timestamp();

DROP TRIGGER IF EXISTS trigger_session_data_change ON public.sessions;
CREATE TRIGGER trigger_session_data_change
AFTER INSERT OR UPDATE ON public.sessions
FOR EACH ROW EXECUTE FUNCTION public.update_user_data_change_timestamp();

DROP TRIGGER IF EXISTS trigger_emotions_data_change ON public.daily_emotions;
CREATE TRIGGER trigger_emotions_data_change
AFTER INSERT OR UPDATE ON public.daily_emotions
FOR EACH ROW EXECUTE FUNCTION public.update_user_data_change_timestamp();

DROP TRIGGER IF EXISTS trigger_life_areas_data_change ON public.daily_life_areas;
CREATE TRIGGER trigger_life_areas_data_change
AFTER INSERT OR UPDATE ON public.daily_life_areas
FOR EACH ROW EXECUTE FUNCTION public.update_user_data_change_timestamp();

DROP TRIGGER IF EXISTS trigger_psychology_data_change ON public.daily_psychology;
CREATE TRIGGER trigger_psychology_data_change
AFTER INSERT OR UPDATE ON public.daily_psychology
FOR EACH ROW EXECUTE FUNCTION public.update_user_data_change_timestamp();