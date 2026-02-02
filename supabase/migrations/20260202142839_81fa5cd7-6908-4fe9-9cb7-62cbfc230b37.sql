-- Create triggers to update last_data_change_at when user data changes
-- This ensures the AI cache gets invalidated and refreshed

-- Trigger for sessions
CREATE TRIGGER update_user_data_on_session_change
AFTER INSERT OR UPDATE ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_user_data_change_timestamp();

-- Trigger for daily_checkins
CREATE TRIGGER update_user_data_on_checkin_change
AFTER INSERT OR UPDATE ON public.daily_checkins
FOR EACH ROW
EXECUTE FUNCTION public.update_user_data_change_timestamp();

-- Trigger for daily_emotions
CREATE TRIGGER update_user_data_on_emotions_change
AFTER INSERT OR UPDATE ON public.daily_emotions
FOR EACH ROW
EXECUTE FUNCTION public.update_user_data_change_timestamp();

-- Trigger for daily_life_areas
CREATE TRIGGER update_user_data_on_life_areas_change
AFTER INSERT OR UPDATE ON public.daily_life_areas
FOR EACH ROW
EXECUTE FUNCTION public.update_user_data_change_timestamp();

-- Trigger for daily_psychology
CREATE TRIGGER update_user_data_on_psychology_change
AFTER INSERT OR UPDATE ON public.daily_psychology
FOR EACH ROW
EXECUTE FUNCTION public.update_user_data_change_timestamp();

-- Trigger for body_metrics
CREATE TRIGGER update_user_data_on_body_metrics_change
AFTER INSERT OR UPDATE ON public.body_metrics
FOR EACH ROW
EXECUTE FUNCTION public.update_user_data_change_timestamp();

-- Trigger for daily_habits
CREATE TRIGGER update_user_data_on_habits_change
AFTER INSERT OR UPDATE ON public.daily_habits
FOR EACH ROW
EXECUTE FUNCTION public.update_user_data_change_timestamp();