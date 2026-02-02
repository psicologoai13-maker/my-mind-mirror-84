-- Add school column to daily_life_areas table for young users
-- This allows tracking "Scuola" instead of "Lavoro" for students

ALTER TABLE public.daily_life_areas 
ADD COLUMN IF NOT EXISTS school integer;

-- Add comment for documentation
COMMENT ON COLUMN public.daily_life_areas.school IS 'School satisfaction score (1-10) for students, alternative to work';

-- Update get_daily_metrics function to include school
CREATE OR REPLACE FUNCTION public.get_daily_metrics(p_user_id uuid, p_date date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
  v_checkin_data jsonb;
  v_session_data jsonb;
  v_emotions_data jsonb;
  v_life_areas_data jsonb;
  v_psychology_data jsonb;
  v_final_mood numeric;
  v_final_anxiety numeric;
  v_final_energy numeric;
  v_final_sleep numeric;
  v_final_joy numeric;
  v_final_sadness numeric;
  v_final_anger numeric;
  v_final_fear numeric;
  v_final_apathy numeric;
  v_final_love numeric;
  v_final_work numeric;
  v_final_school numeric;
  v_final_health numeric;
  v_final_social numeric;
  v_final_growth numeric;
  v_checkin_age_hours numeric;
  v_use_checkin_priority boolean := false;
BEGIN
  -- SECURITY CHECK: User can only query their own metrics OR doctors can query their patients
  IF p_user_id != auth.uid() AND NOT EXISTS (
    SELECT 1 FROM public.doctor_patient_access 
    WHERE doctor_id = auth.uid() 
      AND patient_id = p_user_id 
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: can only query own metrics or assigned patients';
  END IF;

  -- 1. Get today's checkin data (if exists)
  SELECT jsonb_build_object(
    'mood_value', dc.mood_value,
    'notes', dc.notes,
    'created_at', dc.created_at,
    'age_hours', EXTRACT(EPOCH FROM (now() - dc.created_at)) / 3600
  )
  INTO v_checkin_data
  FROM daily_checkins dc
  WHERE dc.user_id = p_user_id
    AND DATE(dc.created_at) = p_date
  ORDER BY dc.created_at DESC
  LIMIT 1;

  -- Check if checkin is recent (within 2 hours) - give it priority
  IF v_checkin_data IS NOT NULL THEN
    v_checkin_age_hours := (v_checkin_data->>'age_hours')::numeric;
    v_use_checkin_priority := (v_checkin_age_hours < 2);
  END IF;

  -- 2. Get session data averages for the day
  SELECT jsonb_build_object(
    'avg_mood', AVG(s.mood_score_detected),
    'avg_anxiety', AVG(s.anxiety_score_detected),
    'avg_sleep', AVG(s.sleep_quality),
    'session_count', COUNT(*)
  )
  INTO v_session_data
  FROM sessions s
  WHERE s.user_id = p_user_id
    AND DATE(s.start_time) = p_date
    AND s.status = 'completed';

  -- 3. Get emotions from daily_emotions table (EXTENDED with new columns)
  SELECT jsonb_build_object(
    'joy', COALESCE(de.joy, 0),
    'sadness', COALESCE(de.sadness, 0),
    'anger', COALESCE(de.anger, 0),
    'fear', COALESCE(de.fear, 0),
    'apathy', COALESCE(de.apathy, 0),
    'shame', de.shame,
    'jealousy', de.jealousy,
    'hope', de.hope,
    'frustration', de.frustration,
    'nostalgia', de.nostalgia,
    'nervousness', de.nervousness,
    'overwhelm', de.overwhelm,
    'excitement', de.excitement,
    'disappointment', de.disappointment
  )
  INTO v_emotions_data
  FROM daily_emotions de
  WHERE de.user_id = p_user_id
    AND de.date = p_date
  ORDER BY de.updated_at DESC
  LIMIT 1;

  -- 4. Get life areas from daily_life_areas table (now includes school)
  SELECT jsonb_build_object(
    'love', dla.love,
    'work', dla.work,
    'school', dla.school,
    'health', dla.health,
    'social', dla.social,
    'growth', dla.growth
  )
  INTO v_life_areas_data
  FROM daily_life_areas dla
  WHERE dla.user_id = p_user_id
    AND dla.date = p_date
  ORDER BY dla.updated_at DESC
  LIMIT 1;

  -- 5. Get deep psychology from daily_psychology table (EXTENDED with new columns)
  SELECT jsonb_build_object(
    'rumination', dp.rumination,
    'self_efficacy', dp.self_efficacy,
    'mental_clarity', dp.mental_clarity,
    'burnout_level', dp.burnout_level,
    'coping_ability', dp.coping_ability,
    'loneliness_perceived', dp.loneliness_perceived,
    'somatic_tension', dp.somatic_tension,
    'appetite_changes', dp.appetite_changes,
    'sunlight_exposure', dp.sunlight_exposure,
    'guilt', dp.guilt,
    'gratitude', dp.gratitude,
    'irritability', dp.irritability,
    'concentration', dp.concentration,
    'motivation', dp.motivation,
    'intrusive_thoughts', dp.intrusive_thoughts,
    'self_worth', dp.self_worth
  )
  INTO v_psychology_data
  FROM daily_psychology dp
  WHERE dp.user_id = p_user_id
    AND dp.date = p_date
  ORDER BY dp.updated_at DESC
  LIMIT 1;

  -- 6. Calculate final vitals with priority rules
  
  -- MOOD: Checkin (1-5 scale -> 1-10) or Session (1-10)
  IF v_checkin_data IS NOT NULL THEN
    v_final_mood := ((v_checkin_data->>'mood_value')::numeric / 5) * 10;
  ELSIF v_session_data->>'avg_mood' IS NOT NULL THEN
    v_final_mood := (v_session_data->>'avg_mood')::numeric;
  ELSE
    v_final_mood := NULL;
  END IF;

  -- ANXIETY, ENERGY, SLEEP: From checkin notes (JSON) or sessions
  IF v_checkin_data IS NOT NULL AND v_checkin_data->>'notes' IS NOT NULL THEN
    BEGIN
      DECLARE
        v_notes jsonb;
      BEGIN
        v_notes := (v_checkin_data->>'notes')::jsonb;
        
        IF v_notes->>'anxiety' IS NOT NULL THEN
          v_final_anxiety := (v_notes->>'anxiety')::numeric;
        END IF;
        IF v_notes->>'energy' IS NOT NULL THEN
          v_final_energy := (v_notes->>'energy')::numeric;
        END IF;
        IF v_notes->>'sleep' IS NOT NULL THEN
          v_final_sleep := (v_notes->>'sleep')::numeric;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END;
  END IF;

  -- Fill from sessions if not set from checkin
  IF v_final_anxiety IS NULL AND v_session_data->>'avg_anxiety' IS NOT NULL THEN
    v_final_anxiety := (v_session_data->>'avg_anxiety')::numeric;
  END IF;
  
  IF v_final_sleep IS NULL AND v_session_data->>'avg_sleep' IS NOT NULL THEN
    v_final_sleep := (v_session_data->>'avg_sleep')::numeric;
  END IF;

  -- Energy: derive from mood and anxiety if not directly available
  IF v_final_energy IS NULL AND v_final_mood IS NOT NULL THEN
    v_final_energy := GREATEST(1, LEAST(10, v_final_mood - COALESCE(v_final_anxiety, 5) * 0.3 + 2));
  END IF;

  -- 7. Extract emotions (from daily_emotions table)
  IF v_emotions_data IS NOT NULL THEN
    v_final_joy := COALESCE((v_emotions_data->>'joy')::numeric, 0);
    v_final_sadness := COALESCE((v_emotions_data->>'sadness')::numeric, 0);
    v_final_anger := COALESCE((v_emotions_data->>'anger')::numeric, 0);
    v_final_fear := COALESCE((v_emotions_data->>'fear')::numeric, 0);
    v_final_apathy := COALESCE((v_emotions_data->>'apathy')::numeric, 0);
  ELSE
    v_final_joy := 0;
    v_final_sadness := 0;
    v_final_anger := 0;
    v_final_fear := 0;
    v_final_apathy := 0;
  END IF;

  -- 8. Extract life areas (from daily_life_areas table, now includes school)
  IF v_life_areas_data IS NOT NULL THEN
    v_final_love := (v_life_areas_data->>'love')::numeric;
    v_final_work := (v_life_areas_data->>'work')::numeric;
    v_final_school := (v_life_areas_data->>'school')::numeric;
    v_final_health := (v_life_areas_data->>'health')::numeric;
    v_final_social := (v_life_areas_data->>'social')::numeric;
    v_final_growth := (v_life_areas_data->>'growth')::numeric;
  END IF;

  -- 9. Build final result with ALL data unified (including extended emotions and psychology)
  v_result := jsonb_build_object(
    'date', p_date,
    'vitals', jsonb_build_object(
      'mood', ROUND(COALESCE(v_final_mood, 0)::numeric, 1),
      'anxiety', ROUND(COALESCE(v_final_anxiety, 0)::numeric, 1),
      'energy', ROUND(COALESCE(v_final_energy, 0)::numeric, 1),
      'sleep', ROUND(COALESCE(v_final_sleep, 0)::numeric, 1)
    ),
    'emotions', jsonb_build_object(
      'joy', ROUND(v_final_joy::numeric, 0),
      'sadness', ROUND(v_final_sadness::numeric, 0),
      'anger', ROUND(v_final_anger::numeric, 0),
      'fear', ROUND(v_final_fear::numeric, 0),
      'apathy', ROUND(v_final_apathy::numeric, 0)
    ),
    'emotions_extended', COALESCE(v_emotions_data, jsonb_build_object(
      'nervousness', null,
      'overwhelm', null,
      'excitement', null,
      'disappointment', null,
      'shame', null,
      'jealousy', null,
      'hope', null,
      'frustration', null,
      'nostalgia', null
    )),
    'life_areas', jsonb_build_object(
      'love', v_final_love,
      'work', v_final_work,
      'school', v_final_school,
      'health', v_final_health,
      'social', v_final_social,
      'growth', v_final_growth
    ),
    'deep_psychology', COALESCE(v_psychology_data, jsonb_build_object(
      'rumination', null,
      'self_efficacy', null,
      'mental_clarity', null,
      'burnout_level', null,
      'coping_ability', null,
      'loneliness_perceived', null,
      'somatic_tension', null,
      'appetite_changes', null,
      'sunlight_exposure', null,
      'guilt', null,
      'gratitude', null,
      'irritability', null,
      'concentration', null,
      'motivation', null,
      'intrusive_thoughts', null,
      'self_worth', null
    )),
    'has_checkin', v_checkin_data IS NOT NULL,
    'has_sessions', (v_session_data->>'session_count')::int > 0,
    'has_emotions', v_emotions_data IS NOT NULL,
    'has_life_areas', v_life_areas_data IS NOT NULL,
    'has_psychology', v_psychology_data IS NOT NULL,
    'checkin_priority', v_use_checkin_priority
  );

  RETURN v_result;
END;
$function$;