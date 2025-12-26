-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('patient', 'doctor');

-- Create user_roles table (security best practice: roles in separate table)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'patient',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own role on signup"
ON public.user_roles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create doctor_patient_access table
CREATE TABLE public.doctor_patient_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  access_granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (doctor_id, patient_id)
);

-- Enable RLS
ALTER TABLE public.doctor_patient_access ENABLE ROW LEVEL SECURITY;

-- Doctors can view their patient connections
CREATE POLICY "Doctors can view their patient connections"
ON public.doctor_patient_access
FOR SELECT
USING (
  auth.uid() = doctor_id 
  AND public.has_role(auth.uid(), 'doctor')
);

-- Doctors can add patients
CREATE POLICY "Doctors can add patients"
ON public.doctor_patient_access
FOR INSERT
WITH CHECK (
  auth.uid() = doctor_id 
  AND public.has_role(auth.uid(), 'doctor')
);

-- Doctors can update their connections
CREATE POLICY "Doctors can update their connections"
ON public.doctor_patient_access
FOR UPDATE
USING (
  auth.uid() = doctor_id 
  AND public.has_role(auth.uid(), 'doctor')
);

-- Doctors can delete connections
CREATE POLICY "Doctors can delete their connections"
ON public.doctor_patient_access
FOR DELETE
USING (
  auth.uid() = doctor_id 
  AND public.has_role(auth.uid(), 'doctor')
);

-- Patients can view who has access to them
CREATE POLICY "Patients can view their doctor connections"
ON public.doctor_patient_access
FOR SELECT
USING (auth.uid() = patient_id);

-- Add connection_code to user_profiles for patient linking
ALTER TABLE public.user_profiles 
ADD COLUMN connection_code VARCHAR(8) UNIQUE;

-- Function to generate unique connection code
CREATE OR REPLACE FUNCTION public.generate_connection_code()
RETURNS VARCHAR(8)
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result VARCHAR(8) := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Update existing profiles with connection codes
UPDATE public.user_profiles 
SET connection_code = public.generate_connection_code()
WHERE connection_code IS NULL;

-- Trigger to auto-generate connection code on profile creation
CREATE OR REPLACE FUNCTION public.set_connection_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.connection_code IS NULL THEN
    NEW.connection_code := public.generate_connection_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_connection_code
BEFORE INSERT ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_connection_code();

-- Function to find patient by connection code (for doctor use)
CREATE OR REPLACE FUNCTION public.find_patient_by_code(_code VARCHAR)
RETURNS TABLE(user_id UUID, name TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT up.user_id, up.name
  FROM public.user_profiles up
  INNER JOIN public.user_roles ur ON up.user_id = ur.user_id
  WHERE up.connection_code = UPPER(_code)
    AND ur.role = 'patient'
$$;