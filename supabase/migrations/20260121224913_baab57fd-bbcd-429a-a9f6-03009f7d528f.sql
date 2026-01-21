-- Create RPC function to get aggregated daily metrics
-- This is the SINGLE SOURCE OF TRUTH for all frontend components

CREATE OR REPLACE FUNCTION public.get_daily_metrics(
  p_user_id uuid,
  p_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
  v_checkin_data jsonb;
  v_session_data jsonb;
  v_final_mood numeric;
  v_final_anxiety numeric;
  v_final_energy numeric;
  v_final_sleep numeric;
  v_final_joy numeric;
  v_final_sadness numeric;
  v_final_anger numeric;
  v_final_fear numeric;
  v_final_apathy numeric;
  v_checkin_age_hours numeric;
  v_use_checkin_priority boolean := false;
BEGIN
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
    'avg_joy', AVG((s.specific_emotions->>'joy')::numeric),
    'avg_sadness', AVG((s.specific_emotions->>'sadness')::numeric),
    'avg_anger', AVG((s.specific_emotions->>'anger')::numeric),
    'avg_fear', AVG((s.specific_emotions->>'fear')::numeric),
    'avg_apathy', AVG((s.specific_emotions->>'apathy')::numeric),
    'session_count', COUNT(*)
  )
  INTO v_session_data
  FROM sessions s
  WHERE s.user_id = p_user_id
    AND DATE(s.start_time) = p_date
    AND s.status = 'completed';

  -- 3. Calculate final values with priority rules
  
  -- MOOD: Checkin (1-5 scale -> 1-10) or Session (1-10)
  IF v_checkin_data IS NOT NULL THEN
    -- Convert 1-5 to 1-10 scale
    v_final_mood := ((v_checkin_data->>'mood_value')::numeric / 5) * 10;
  ELSIF v_session_data->>'avg_mood' IS NOT NULL THEN
    v_final_mood := (v_session_data->>'avg_mood')::numeric;
  ELSE
    v_final_mood := NULL;
  END IF;

  -- ANXIETY, ENERGY, SLEEP: From checkin notes (JSON) or sessions
  IF v_checkin_data IS NOT NULL AND v_checkin_data->>'notes' IS NOT NULL THEN
    BEGIN
      -- Parse notes JSON for anxiety, energy, sleep
      DECLARE
        v_notes jsonb;
      BEGIN
        v_notes := (v_checkin_data->>'notes')::jsonb;
        
        -- These are stored as 1-10 in notes
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
        -- Notes not valid JSON, ignore
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

  -- EMOTIONS: From sessions only (AI-analyzed)
  IF v_session_data->>'avg_joy' IS NOT NULL THEN
    v_final_joy := (v_session_data->>'avg_joy')::numeric;
    v_final_sadness := (v_session_data->>'avg_sadness')::numeric;
    v_final_anger := (v_session_data->>'avg_anger')::numeric;
    v_final_fear := (v_session_data->>'avg_fear')::numeric;
    v_final_apathy := (v_session_data->>'avg_apathy')::numeric;
  END IF;

  -- 4. Build final result
  v_result := jsonb_build_object(
    'date', p_date,
    'vitals', jsonb_build_object(
      'mood', ROUND(COALESCE(v_final_mood, 0)::numeric, 1),
      'anxiety', ROUND(COALESCE(v_final_anxiety, 0)::numeric, 1),
      'energy', ROUND(COALESCE(v_final_energy, 0)::numeric, 1),
      'sleep', ROUND(COALESCE(v_final_sleep, 0)::numeric, 1)
    ),
    'emotions', jsonb_build_object(
      'joy', ROUND(COALESCE(v_final_joy, 0)::numeric, 0),
      'sadness', ROUND(COALESCE(v_final_sadness, 0)::numeric, 0),
      'anger', ROUND(COALESCE(v_final_anger, 0)::numeric, 0),
      'fear', ROUND(COALESCE(v_final_fear, 0)::numeric, 0),
      'apathy', ROUND(COALESCE(v_final_apathy, 0)::numeric, 0)
    ),
    'has_checkin', v_checkin_data IS NOT NULL,
    'has_sessions', (v_session_data->>'session_count')::int > 0,
    'checkin_priority', v_use_checkin_priority
  );

  RETURN v_result;
END;
$$;