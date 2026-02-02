-- Add reminder fields to user_habits_config
ALTER TABLE public.user_habits_config 
ADD COLUMN reminder_enabled boolean DEFAULT false,
ADD COLUMN reminder_time time DEFAULT '09:00:00';