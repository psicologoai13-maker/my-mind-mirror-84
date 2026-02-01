-- Add finance tracking fields to user_objectives
ALTER TABLE public.user_objectives 
ADD COLUMN IF NOT EXISTS finance_tracking_type text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS tracking_period text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS needs_clarification boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS clarification_asked_at timestamp with time zone DEFAULT NULL;

-- Comments for documentation
COMMENT ON COLUMN public.user_objectives.finance_tracking_type IS 'Type of financial tracking: accumulation, periodic_saving, spending_limit, periodic_income, debt_reduction';
COMMENT ON COLUMN public.user_objectives.tracking_period IS 'Period for periodic objectives: daily, weekly, monthly, yearly, one_time';
COMMENT ON COLUMN public.user_objectives.needs_clarification IS 'Flag to indicate Aria needs to ask for more details';
COMMENT ON COLUMN public.user_objectives.clarification_asked_at IS 'Last time Aria asked for clarification';