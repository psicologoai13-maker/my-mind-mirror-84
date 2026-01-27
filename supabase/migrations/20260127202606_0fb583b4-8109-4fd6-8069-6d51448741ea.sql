-- Add starting_value column to track the initial value for objectives
ALTER TABLE public.user_objectives 
ADD COLUMN starting_value numeric NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.user_objectives.starting_value IS 'The initial/starting value when the objective was created. Used with current_value and target_value to calculate true progress percentage.';