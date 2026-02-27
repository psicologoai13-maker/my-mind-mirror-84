-- =============================================
-- ARIA V2.0 - HealthKit Data
-- =============================================

-- Tabella dati HealthKit
CREATE TABLE IF NOT EXISTS public.healthkit_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  steps INTEGER,
  sleep_hours NUMERIC(4,2),
  sleep_quality_hk TEXT,
  heart_rate_avg NUMERIC(6,2),
  hrv_avg NUMERIC(6,2),
  active_energy NUMERIC(8,2),
  exercise_minutes INTEGER,
  weight_kg NUMERIC(5,2),
  body_fat_pct NUMERIC(5,2),
  menstrual_cycle_phase TEXT,
  synced_at TIMESTAMPTZ DEFAULT now()
);

-- UNIQUE constraint: un record per utente al giorno
ALTER TABLE public.healthkit_data
  ADD CONSTRAINT healthkit_data_user_date_unique UNIQUE (user_id, date);

-- RLS
ALTER TABLE public.healthkit_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own healthkit data"
  ON public.healthkit_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own healthkit data"
  ON public.healthkit_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own healthkit data"
  ON public.healthkit_data FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own healthkit data"
  ON public.healthkit_data FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger: aggiorna user_profiles.last_data_change_at dopo INSERT/UPDATE
DROP TRIGGER IF EXISTS healthkit_update_user_data_change ON public.healthkit_data;
CREATE TRIGGER healthkit_update_user_data_change
  AFTER INSERT OR UPDATE ON public.healthkit_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_data_change_timestamp();
