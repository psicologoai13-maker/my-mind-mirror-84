-- Drop and recreate the function to handle users without explicit role
CREATE OR REPLACE FUNCTION public.find_patient_by_code(_code character varying)
RETURNS TABLE(user_id uuid, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT up.user_id, up.name
  FROM public.user_profiles up
  LEFT JOIN public.user_roles ur ON up.user_id = ur.user_id
  WHERE up.connection_code = UPPER(_code)
    AND (ur.role = 'patient' OR ur.role IS NULL)  -- Include users without role (default to patient)
$$;