-- Drop and recreate function with improved session detection
DROP FUNCTION IF EXISTS public.get_daily_metrics(uuid, date);

CREATE FUNCTION public.get_daily_metrics(p_user_id uuid, p_date date DEFAULT CURRENT_DATE)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  v_checkin record;
  v_session_count integer;
  v_session_mood numeric;
  v_session_anxiety numeric;
  v_session_sleep numeric;
  v_emotions record;
  v_life_areas record;
  v_psychology record;
  v_mood numeric := 0;
  v_anxiety numeric := 0;
  v_energy numeric := 0;
  v_sleep numeric := 0;
  v_has_checkin boolean := false;
  v_has_sessions boolean := false;
  v_has_emotions boolean := false;
  v_has_life_areas boolean := false;
  v_has_psychology boolean := false;
  v_checkin_priority boolean := false;
BEGIN
  -- Get today's checkin (most recent)
  SELECT * INTO v_checkin FROM daily_checkins
  WHERE user_id = p_user_id
    AND DATE(created_at AT TIME ZONE 'Europe/Rome') = p_date
  ORDER BY created_at DESC
  LIMIT 1;

  -- Get today's completed sessions (individual values, not a single record)
  SELECT 
    COUNT(*),
    AVG(mood_score_detected) FILTER (WHERE mood_score_detected > 0),
    AVG(anxiety_score_detected) FILTER (WHERE anxiety_score_detected > 0),
    AVG(sleep_quality) FILTER (WHERE sleep_quality > 0)
  INTO v_session_count, v_session_mood, v_session_anxiety, v_session_sleep
  FROM sessions
  WHERE user_id = p_user_id
    AND DATE(start_time AT TIME ZONE 'Europe/Rome') = p_date
    AND status = 'completed';

  -- Check if we have checkin data
  IF v_checkin IS NOT NULL THEN
    v_has_checkin := true;
    -- Only use checkin mood if it's > 0 (explicit mood check-in)
    IF v_checkin.mood_value > 0 THEN
      v_mood := v_checkin.mood_value * 2; -- Convert 1-5 to 1-10 scale
      v_checkin_priority := true;
    END IF;
    
    -- Parse notes for other vitals
    IF v_checkin.notes IS NOT NULL THEN
      BEGIN
        v_anxiety := COALESCE((v_checkin.notes::json->>'anxiety')::numeric, 0);
        v_energy := COALESCE((v_checkin.notes::json->>'energy')::numeric, 0);
        v_sleep := COALESCE((v_checkin.notes::json->>'sleep')::numeric, 0);
      EXCEPTION WHEN OTHERS THEN
        NULL; -- Ignore JSON parse errors
      END;
    END IF;
  END IF;

  -- Session data processing
  IF v_session_count > 0 THEN
    v_has_sessions := true;
    -- Use session mood when there's no explicit checkin mood
    IF v_mood = 0 AND v_session_mood IS NOT NULL THEN
      v_mood := v_session_mood;
    END IF;
    -- Fill in missing vitals from sessions
    IF v_anxiety = 0 AND v_session_anxiety IS NOT NULL THEN
      v_anxiety := v_session_anxiety;
    END IF;
    IF v_sleep = 0 AND v_session_sleep IS NOT NULL THEN
      v_sleep := v_session_sleep;
    END IF;
  END IF;

  -- Get today's emotions
  SELECT * INTO v_emotions FROM daily_emotions
  WHERE user_id = p_user_id AND date = p_date
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_emotions IS NOT NULL THEN
    v_has_emotions := true;
  END IF;

  -- Get today's life areas
  SELECT * INTO v_life_areas FROM daily_life_areas
  WHERE user_id = p_user_id AND date = p_date
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_life_areas IS NOT NULL THEN
    v_has_life_areas := true;
  END IF;

  -- Get today's psychology
  SELECT * INTO v_psychology FROM daily_psychology
  WHERE user_id = p_user_id AND date = p_date
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_psychology IS NOT NULL THEN
    v_has_psychology := true;
  END IF;

  -- Build result JSON
  result := json_build_object(
    'date', p_date,
    'vitals', json_build_object(
      'mood', COALESCE(v_mood, 0),
      'anxiety', COALESCE(v_anxiety, 0),
      'energy', COALESCE(v_energy, 0),
      'sleep', COALESCE(v_sleep, 0)
    ),
    'emotions', json_build_object(
      'joy', COALESCE(v_emotions.joy, 0),
      'sadness', COALESCE(v_emotions.sadness, 0),
      'anger', COALESCE(v_emotions.anger, 0),
      'fear', COALESCE(v_emotions.fear, 0),
      'apathy', COALESCE(v_emotions.apathy, 0)
    ),
    'life_areas', json_build_object(
      'love', v_life_areas.love,
      'work', v_life_areas.work,
      'school', v_life_areas.school,
      'health', v_life_areas.health,
      'social', v_life_areas.social,
      'growth', v_life_areas.growth
    ),
    'deep_psychology', json_build_object(
      'rumination', v_psychology.rumination,
      'self_efficacy', v_psychology.self_efficacy,
      'mental_clarity', v_psychology.mental_clarity,
      'concentration', v_psychology.concentration,
      'burnout_level', v_psychology.burnout_level,
      'coping_ability', v_psychology.coping_ability,
      'loneliness_perceived', v_psychology.loneliness_perceived,
      'somatic_tension', v_psychology.somatic_tension,
      'appetite_changes', v_psychology.appetite_changes,
      'sunlight_exposure', v_psychology.sunlight_exposure,
      'guilt', v_psychology.guilt,
      'gratitude', v_psychology.gratitude,
      'irritability', v_psychology.irritability,
      'motivation', v_psychology.motivation,
      'intrusive_thoughts', v_psychology.intrusive_thoughts,
      'self_worth', v_psychology.self_worth
    ),
    'has_checkin', v_has_checkin,
    'has_sessions', v_has_sessions,
    'has_emotions', v_has_emotions,
    'has_life_areas', v_has_life_areas,
    'has_psychology', v_has_psychology,
    'checkin_priority', v_checkin_priority
  );

  RETURN result;
END;
$$;