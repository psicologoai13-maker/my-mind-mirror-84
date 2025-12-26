-- 1. FIX: Doctors can view their assigned patients' sessions
CREATE POLICY "Doctors can view assigned patients sessions"
ON public.sessions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.doctor_patient_access
    WHERE doctor_patient_access.patient_id = sessions.user_id
      AND doctor_patient_access.doctor_id = auth.uid()
      AND doctor_patient_access.is_active = true
  )
);

-- 2. FIX: Doctors can view their assigned patients' daily checkins
CREATE POLICY "Doctors can view assigned patients checkins"
ON public.daily_checkins
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.doctor_patient_access
    WHERE doctor_patient_access.patient_id = daily_checkins.user_id
      AND doctor_patient_access.doctor_id = auth.uid()
      AND doctor_patient_access.is_active = true
  )
);

-- 3. FIX: Doctors can view their assigned patients' profiles
CREATE POLICY "Doctors can view assigned patients profiles"
ON public.user_profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.doctor_patient_access
    WHERE doctor_patient_access.patient_id = user_profiles.user_id
      AND doctor_patient_access.doctor_id = auth.uid()
      AND doctor_patient_access.is_active = true
  )
);

-- 4. FIX: Patients can revoke doctor access (delete their own connections)
CREATE POLICY "Patients can revoke doctor access"
ON public.doctor_patient_access
FOR DELETE
USING (auth.uid() = patient_id);