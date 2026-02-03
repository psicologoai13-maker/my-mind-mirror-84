-- Add occupation_context field to user_profiles
-- Values: 'student', 'worker', 'both', null (null = needs to be asked by Aria)
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS occupation_context text DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.user_profiles.occupation_context IS 'User occupation status: student, worker, both, or null (needs clarification from Aria for 18-27 age range)';