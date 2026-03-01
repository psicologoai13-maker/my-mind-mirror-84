-- =============================================
-- P3 FIXES BATCH 1 — 1 Marzo 2026
-- Contenuto:
--   1. Aggiunta colonna timezone a user_profiles
--   2. VERSIONE DEFINITIVA get_daily_metrics (consolidata da 12 migrazioni)
--   3. check_and_award_badges ottimizzata con early-exit e skip badge già sbloccati
-- =============================================

-- ─────────────────────────────────────────────
-- 1. TIMEZONE COLUMN
-- ─────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'timezone'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN timezone TEXT DEFAULT 'Europe/Rome';
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 2. VERSIONE DEFINITIVA get_daily_metrics
--    Consolidata da 12 migrazioni precedenti.
--    Aggiunto parametro opzionale p_timezone.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_daily_metrics(
  p_user_id uuid,
  p_date date DEFAULT CURRENT_DATE,
  p_timezone text DEFAULT 'Europe/Rome'
)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result json;
  v_checkin record;
  v_session_count integer;
  v_session_mood numeric;
  v_session_anxiety numeric;
  v_session_sleep numeric;
  v_session_energy numeric;
  v_session_energy_lbs numeric;
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
  -- Life areas aggregated
  v_la_work integer;
  v_la_school integer;
  v_la_love integer;
  v_la_family integer;
  v_la_social integer;
  v_la_health integer;
  v_la_growth integer;
  v_la_leisure integer;
  v_la_finances integer;
BEGIN
  -- Get today's checkin (most recent)
  SELECT * INTO v_checkin FROM daily_checkins
  WHERE user_id = p_user_id
    AND DATE(created_at AT TIME ZONE p_timezone) = p_date
  ORDER BY created_at DESC
  LIMIT 1;

  -- Get today's completed sessions (including energy from both columns)
  SELECT
    COUNT(*),
    AVG(mood_score_detected) FILTER (WHERE mood_score_detected > 0),
    AVG(anxiety_score_detected) FILTER (WHERE anxiety_score_detected > 0),
    AVG(sleep_quality) FILTER (WHERE sleep_quality > 0),
    AVG(energy_score_detected) FILTER (WHERE energy_score_detected > 0),
    AVG((life_balance_scores->>'energy')::numeric) FILTER (WHERE (life_balance_scores->>'energy')::numeric > 0)
  INTO v_session_count, v_session_mood, v_session_anxiety, v_session_sleep, v_session_energy, v_session_energy_lbs
  FROM sessions
  WHERE user_id = p_user_id
    AND DATE(start_time AT TIME ZONE p_timezone) = p_date
    AND status = 'completed';

  -- Check if we have checkin data
  IF v_checkin IS NOT NULL THEN
    v_has_checkin := true;
    IF v_checkin.mood_value > 0 THEN
      v_mood := v_checkin.mood_value * 2;
      v_checkin_priority := true;
    END IF;

    IF v_checkin.notes IS NOT NULL THEN
      BEGIN
        v_anxiety := COALESCE((v_checkin.notes::json->>'anxiety')::numeric, 0);
        v_energy := COALESCE((v_checkin.notes::json->>'energy')::numeric, 0);
        v_sleep := COALESCE((v_checkin.notes::json->>'sleep')::numeric, 0);
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;
  END IF;

  -- Session data processing
  IF v_session_count > 0 THEN
    v_has_sessions := true;
    IF v_mood = 0 AND v_session_mood IS NOT NULL THEN
      v_mood := v_session_mood;
    END IF;
    IF v_anxiety = 0 AND v_session_anxiety IS NOT NULL THEN
      v_anxiety := v_session_anxiety;
    END IF;
    IF v_sleep = 0 AND v_session_sleep IS NOT NULL THEN
      v_sleep := v_session_sleep;
    END IF;
    IF v_energy = 0 THEN
      IF v_session_energy IS NOT NULL THEN
        v_energy := v_session_energy;
      ELSIF v_session_energy_lbs IS NOT NULL THEN
        v_energy := v_session_energy_lbs;
      END IF;
    END IF;
  END IF;

  -- Get today's emotions (merge all records for the day)
  SELECT
    MAX(joy) as joy,
    MAX(sadness) as sadness,
    MAX(anger) as anger,
    MAX(fear) as fear,
    MAX(apathy) as apathy,
    MAX(shame) as shame,
    MAX(jealousy) as jealousy,
    MAX(hope) as hope,
    MAX(frustration) as frustration,
    MAX(nostalgia) as nostalgia,
    MAX(nervousness) as nervousness,
    MAX(overwhelm) as overwhelm,
    MAX(excitement) as excitement,
    MAX(disappointment) as disappointment,
    MAX(disgust) as disgust,
    MAX(surprise) as surprise,
    MAX(serenity) as serenity,
    MAX(pride) as pride,
    MAX(affection) as affection,
    MAX(curiosity) as curiosity
  INTO v_emotions
  FROM daily_emotions
  WHERE user_id = p_user_id AND date = p_date;

  IF v_emotions.joy IS NOT NULL OR v_emotions.sadness IS NOT NULL OR
     v_emotions.anger IS NOT NULL OR v_emotions.fear IS NOT NULL OR
     v_emotions.apathy IS NOT NULL THEN
    v_has_emotions := true;
  END IF;

  -- Get today's life areas (MERGE ALL records)
  SELECT
    MAX(work) as work,
    MAX(school) as school,
    MAX(love) as love,
    MAX(family) as family,
    MAX(social) as social,
    MAX(health) as health,
    MAX(growth) as growth,
    MAX(leisure) as leisure,
    MAX(finances) as finances
  INTO v_la_work, v_la_school, v_la_love, v_la_family, v_la_social, v_la_health, v_la_growth, v_la_leisure, v_la_finances
  FROM daily_life_areas
  WHERE user_id = p_user_id AND date = p_date;

  IF v_la_work IS NOT NULL OR v_la_school IS NOT NULL OR v_la_love IS NOT NULL OR
     v_la_social IS NOT NULL OR v_la_health IS NOT NULL OR v_la_growth IS NOT NULL OR
     v_la_family IS NOT NULL OR v_la_leisure IS NOT NULL OR v_la_finances IS NOT NULL THEN
    v_has_life_areas := true;
  END IF;

  -- Get today's psychology (merge all records)
  SELECT
    MAX(rumination) as rumination,
    MAX(self_efficacy) as self_efficacy,
    MAX(mental_clarity) as mental_clarity,
    MAX(concentration) as concentration,
    MAX(burnout_level) as burnout_level,
    MAX(coping_ability) as coping_ability,
    MAX(loneliness_perceived) as loneliness_perceived,
    MAX(somatic_tension) as somatic_tension,
    MAX(appetite_changes) as appetite_changes,
    MAX(sunlight_exposure) as sunlight_exposure,
    MAX(guilt) as guilt,
    MAX(gratitude) as gratitude,
    MAX(irritability) as irritability,
    MAX(motivation) as motivation,
    MAX(intrusive_thoughts) as intrusive_thoughts,
    MAX(self_worth) as self_worth,
    MAX(suicidal_ideation) as suicidal_ideation,
    MAX(hopelessness) as hopelessness,
    MAX(self_harm_urges) as self_harm_urges,
    MAX(dissociation) as dissociation,
    MAX(confusion) as confusion,
    MAX(racing_thoughts) as racing_thoughts,
    MAX(avoidance) as avoidance,
    MAX(social_withdrawal) as social_withdrawal,
    MAX(compulsive_urges) as compulsive_urges,
    MAX(procrastination) as procrastination,
    MAX(sense_of_purpose) as sense_of_purpose,
    MAX(life_satisfaction) as life_satisfaction,
    MAX(perceived_social_support) as perceived_social_support,
    MAX(emotional_regulation) as emotional_regulation,
    MAX(resilience) as resilience,
    MAX(mindfulness) as mindfulness
  INTO v_psychology
  FROM daily_psychology
  WHERE user_id = p_user_id AND date = p_date;

  IF v_psychology.rumination IS NOT NULL OR v_psychology.burnout_level IS NOT NULL OR
     v_psychology.mental_clarity IS NOT NULL THEN
    v_has_psychology := true;
  END IF;

  -- Build result JSON with all extended metrics
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
      'apathy', COALESCE(v_emotions.apathy, 0),
      'shame', v_emotions.shame,
      'jealousy', v_emotions.jealousy,
      'hope', v_emotions.hope,
      'frustration', v_emotions.frustration,
      'nostalgia', v_emotions.nostalgia,
      'nervousness', v_emotions.nervousness,
      'overwhelm', v_emotions.overwhelm,
      'excitement', v_emotions.excitement,
      'disappointment', v_emotions.disappointment,
      'disgust', v_emotions.disgust,
      'surprise', v_emotions.surprise,
      'serenity', v_emotions.serenity,
      'pride', v_emotions.pride,
      'affection', v_emotions.affection,
      'curiosity', v_emotions.curiosity
    ),
    'life_areas', json_build_object(
      'love', v_la_love,
      'work', v_la_work,
      'school', v_la_school,
      'family', v_la_family,
      'health', v_la_health,
      'social', v_la_social,
      'growth', v_la_growth,
      'leisure', v_la_leisure,
      'finances', v_la_finances
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
      'self_worth', v_psychology.self_worth,
      'suicidal_ideation', v_psychology.suicidal_ideation,
      'hopelessness', v_psychology.hopelessness,
      'self_harm_urges', v_psychology.self_harm_urges,
      'dissociation', v_psychology.dissociation,
      'confusion', v_psychology.confusion,
      'racing_thoughts', v_psychology.racing_thoughts,
      'avoidance', v_psychology.avoidance,
      'social_withdrawal', v_psychology.social_withdrawal,
      'compulsive_urges', v_psychology.compulsive_urges,
      'procrastination', v_psychology.procrastination,
      'sense_of_purpose', v_psychology.sense_of_purpose,
      'life_satisfaction', v_psychology.life_satisfaction,
      'perceived_social_support', v_psychology.perceived_social_support,
      'emotional_regulation', v_psychology.emotional_regulation,
      'resilience', v_psychology.resilience,
      'mindfulness', v_psychology.mindfulness
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
$function$;

-- ─────────────────────────────────────────────
-- 3. check_and_award_badges OTTIMIZZATA
--    Early-exit se ha già tutti i badge.
--    Skip COUNT per badge già sbloccati.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_and_award_badges(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_badges INTEGER := 16;
  unlocked_count INTEGER;
  v_count INTEGER;
  v_val INTEGER;
BEGIN
  -- Early exit: se l'utente ha già tutti i badge, non fare nulla
  SELECT COUNT(*) INTO unlocked_count
  FROM public.user_achievements
  WHERE user_id = p_user_id;

  IF unlocked_count >= total_badges THEN
    RETURN;
  END IF;

  -- 'first_checkin'
  IF NOT EXISTS (SELECT 1 FROM user_achievements WHERE user_id = p_user_id AND achievement_id = 'first_checkin') THEN
    SELECT COUNT(*) INTO v_count FROM public.daily_checkins WHERE user_id = p_user_id;
    IF v_count >= 1 THEN
      INSERT INTO public.user_achievements (user_id, achievement_id, metadata)
      VALUES (p_user_id, 'first_checkin', '{"name":"Primo Check-in","emoji":"✅","description":"Hai completato il tuo primo check-in"}'::jsonb)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
    END IF;
  END IF;

  -- 'first_session'
  IF NOT EXISTS (SELECT 1 FROM user_achievements WHERE user_id = p_user_id AND achievement_id = 'first_session') THEN
    SELECT COUNT(*) INTO v_count FROM public.sessions WHERE user_id = p_user_id;
    IF v_count >= 1 THEN
      INSERT INTO public.user_achievements (user_id, achievement_id, metadata)
      VALUES (p_user_id, 'first_session', '{"name":"Prima Sessione","emoji":"💬","description":"Hai completato la tua prima sessione con Aria"}'::jsonb)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
    END IF;
  END IF;

  -- 'first_voice'
  IF NOT EXISTS (SELECT 1 FROM user_achievements WHERE user_id = p_user_id AND achievement_id = 'first_voice') THEN
    SELECT COUNT(*) INTO v_count FROM public.sessions WHERE user_id = p_user_id AND type = 'voice';
    IF v_count >= 1 THEN
      INSERT INTO public.user_achievements (user_id, achievement_id, metadata)
      VALUES (p_user_id, 'first_voice', '{"name":"Prima Voce","emoji":"🎙️","description":"Hai completato la tua prima sessione vocale"}'::jsonb)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
    END IF;
  END IF;

  -- 'first_diary'
  IF NOT EXISTS (SELECT 1 FROM user_achievements WHERE user_id = p_user_id AND achievement_id = 'first_diary') THEN
    SELECT COUNT(*) INTO v_count FROM public.diary_entries WHERE user_id = p_user_id;
    IF v_count >= 1 THEN
      INSERT INTO public.user_achievements (user_id, achievement_id, metadata)
      VALUES (p_user_id, 'first_diary', '{"name":"Prima Pagina","emoji":"📖","description":"Hai scritto la tua prima voce di diario"}'::jsonb)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
    END IF;
  END IF;

  -- 'first_exercise'
  IF NOT EXISTS (SELECT 1 FROM user_achievements WHERE user_id = p_user_id AND achievement_id = 'first_exercise') THEN
    SELECT COUNT(*) INTO v_count FROM public.user_exercise_sessions WHERE user_id = p_user_id;
    IF v_count >= 1 THEN
      INSERT INTO public.user_achievements (user_id, achievement_id, metadata)
      VALUES (p_user_id, 'first_exercise', '{"name":"Primo Esercizio","emoji":"🧘","description":"Hai completato il tuo primo esercizio"}'::jsonb)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
    END IF;
  END IF;

  -- 'streak_7' and 'streak_30' — reuse same query
  IF NOT EXISTS (SELECT 1 FROM user_achievements WHERE user_id = p_user_id AND achievement_id = 'streak_7')
     OR NOT EXISTS (SELECT 1 FROM user_achievements WHERE user_id = p_user_id AND achievement_id = 'streak_30') THEN
    SELECT MAX(current_streak) INTO v_val FROM public.habit_streaks WHERE user_id = p_user_id;
    IF v_val >= 7 AND NOT EXISTS (SELECT 1 FROM user_achievements WHERE user_id = p_user_id AND achievement_id = 'streak_7') THEN
      INSERT INTO public.user_achievements (user_id, achievement_id, metadata)
      VALUES (p_user_id, 'streak_7', '{"name":"Una Settimana!","emoji":"🔥","description":"Hai mantenuto una streak di 7 giorni"}'::jsonb)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
    END IF;
    IF v_val >= 30 AND NOT EXISTS (SELECT 1 FROM user_achievements WHERE user_id = p_user_id AND achievement_id = 'streak_30') THEN
      INSERT INTO public.user_achievements (user_id, achievement_id, metadata)
      VALUES (p_user_id, 'streak_30', '{"name":"Un Mese!","emoji":"🏆","description":"Hai mantenuto una streak di 30 giorni"}'::jsonb)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
    END IF;
  END IF;

  -- 'level_5'
  IF NOT EXISTS (SELECT 1 FROM user_achievements WHERE user_id = p_user_id AND achievement_id = 'level_5') THEN
    SELECT current_level INTO v_val FROM public.user_profiles WHERE user_id = p_user_id;
    IF v_val >= 5 THEN
      INSERT INTO public.user_achievements (user_id, achievement_id, metadata)
      VALUES (p_user_id, 'level_5', '{"name":"Equilibrato","emoji":"⚖️","description":"Hai raggiunto il livello 5"}'::jsonb)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
    END IF;
  END IF;

  -- 'sessions_10' and 'sessions_50' — reuse same query
  IF NOT EXISTS (SELECT 1 FROM user_achievements WHERE user_id = p_user_id AND achievement_id = 'sessions_10')
     OR NOT EXISTS (SELECT 1 FROM user_achievements WHERE user_id = p_user_id AND achievement_id = 'sessions_50') THEN
    SELECT COUNT(*) INTO v_count FROM public.sessions WHERE user_id = p_user_id;
    IF v_count >= 10 AND NOT EXISTS (SELECT 1 FROM user_achievements WHERE user_id = p_user_id AND achievement_id = 'sessions_10') THEN
      INSERT INTO public.user_achievements (user_id, achievement_id, metadata)
      VALUES (p_user_id, 'sessions_10', '{"name":"10 Sessioni","emoji":"🎯","description":"Hai completato 10 sessioni"}'::jsonb)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
    END IF;
    IF v_count >= 50 AND NOT EXISTS (SELECT 1 FROM user_achievements WHERE user_id = p_user_id AND achievement_id = 'sessions_50') THEN
      INSERT INTO public.user_achievements (user_id, achievement_id, metadata)
      VALUES (p_user_id, 'sessions_50', '{"name":"50 Sessioni","emoji":"🌟","description":"Hai completato 50 sessioni"}'::jsonb)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
    END IF;
  END IF;

  -- 'checkins_30'
  IF NOT EXISTS (SELECT 1 FROM user_achievements WHERE user_id = p_user_id AND achievement_id = 'checkins_30') THEN
    SELECT COUNT(*) INTO v_count FROM public.daily_checkins WHERE user_id = p_user_id;
    IF v_count >= 30 THEN
      INSERT INTO public.user_achievements (user_id, achievement_id, metadata)
      VALUES (p_user_id, 'checkins_30', '{"name":"30 Check-in","emoji":"📊","description":"Hai completato 30 check-in"}'::jsonb)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
    END IF;
  END IF;

  -- 'exercises_10'
  IF NOT EXISTS (SELECT 1 FROM user_achievements WHERE user_id = p_user_id AND achievement_id = 'exercises_10') THEN
    SELECT COUNT(*) INTO v_count FROM public.user_exercise_sessions WHERE user_id = p_user_id;
    IF v_count >= 10 THEN
      INSERT INTO public.user_achievements (user_id, achievement_id, metadata)
      VALUES (p_user_id, 'exercises_10', '{"name":"10 Esercizi","emoji":"💪","description":"Hai completato 10 esercizi"}'::jsonb)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
    END IF;
  END IF;

  -- 'voice_10'
  IF NOT EXISTS (SELECT 1 FROM user_achievements WHERE user_id = p_user_id AND achievement_id = 'voice_10') THEN
    SELECT COUNT(*) INTO v_count FROM public.sessions WHERE user_id = p_user_id AND type = 'voice';
    IF v_count >= 10 THEN
      INSERT INTO public.user_achievements (user_id, achievement_id, metadata)
      VALUES (p_user_id, 'voice_10', '{"name":"10 Sessioni Vocali","emoji":"🎤","description":"Hai completato 10 sessioni vocali"}'::jsonb)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
    END IF;
  END IF;

  -- 'diary_30days'
  IF NOT EXISTS (SELECT 1 FROM user_achievements WHERE user_id = p_user_id AND achievement_id = 'diary_30days') THEN
    SELECT COUNT(DISTINCT entry_date) INTO v_count FROM public.diary_entries WHERE user_id = p_user_id;
    IF v_count >= 30 THEN
      INSERT INTO public.user_achievements (user_id, achievement_id, metadata)
      VALUES (p_user_id, 'diary_30days', '{"name":"30 Giorni di Diario","emoji":"📝","description":"Hai scritto il diario per 30 giorni diversi"}'::jsonb)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
    END IF;
  END IF;

  -- 'points_1000' and 'points_5000' — reuse same query
  IF NOT EXISTS (SELECT 1 FROM user_achievements WHERE user_id = p_user_id AND achievement_id = 'points_1000')
     OR NOT EXISTS (SELECT 1 FROM user_achievements WHERE user_id = p_user_id AND achievement_id = 'points_5000') THEN
    SELECT total_points INTO v_val FROM public.user_reward_points WHERE user_id = p_user_id;
    IF v_val >= 1000 AND NOT EXISTS (SELECT 1 FROM user_achievements WHERE user_id = p_user_id AND achievement_id = 'points_1000') THEN
      INSERT INTO public.user_achievements (user_id, achievement_id, metadata)
      VALUES (p_user_id, 'points_1000', '{"name":"1000 Punti","emoji":"💎","description":"Hai accumulato 1000 punti"}'::jsonb)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
    END IF;
    IF v_val >= 5000 AND NOT EXISTS (SELECT 1 FROM user_achievements WHERE user_id = p_user_id AND achievement_id = 'points_5000') THEN
      INSERT INTO public.user_achievements (user_id, achievement_id, metadata)
      VALUES (p_user_id, 'points_5000', '{"name":"5000 Punti","emoji":"👑","description":"Hai accumulato 5000 punti"}'::jsonb)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
    END IF;
  END IF;

END;
$$;
