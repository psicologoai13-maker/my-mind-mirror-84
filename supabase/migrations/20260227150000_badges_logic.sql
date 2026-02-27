-- =============================================
-- ARIA V2.0 - Badges Logic
-- check_and_award_badges function
-- Must be created BEFORE auto_points_triggers
-- =============================================

CREATE OR REPLACE FUNCTION public.check_and_award_badges(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_val INTEGER;
BEGIN
  -- 'first_checkin' → ha almeno 1 voce in daily_checkins
  SELECT COUNT(*) INTO v_count FROM public.daily_checkins WHERE user_id = p_user_id;
  IF v_count >= 1 THEN
    INSERT INTO public.user_achievements (user_id, achievement_id, metadata)
    VALUES (p_user_id, 'first_checkin', '{"name":"Primo Check-in","emoji":"✅","description":"Hai completato il tuo primo check-in"}'::jsonb)
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;

  -- 'first_session' → ha almeno 1 voce in sessions
  SELECT COUNT(*) INTO v_count FROM public.sessions WHERE user_id = p_user_id;
  IF v_count >= 1 THEN
    INSERT INTO public.user_achievements (user_id, achievement_id, metadata)
    VALUES (p_user_id, 'first_session', '{"name":"Prima Sessione","emoji":"💬","description":"Hai completato la tua prima sessione con Aria"}'::jsonb)
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;

  -- 'first_voice' → ha almeno 1 sessione con type='voice'
  SELECT COUNT(*) INTO v_count FROM public.sessions WHERE user_id = p_user_id AND type = 'voice';
  IF v_count >= 1 THEN
    INSERT INTO public.user_achievements (user_id, achievement_id, metadata)
    VALUES (p_user_id, 'first_voice', '{"name":"Prima Voce","emoji":"🎙️","description":"Hai completato la tua prima sessione vocale"}'::jsonb)
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;

  -- 'first_diary' → ha almeno 1 voce in diary_entries
  SELECT COUNT(*) INTO v_count FROM public.diary_entries WHERE user_id = p_user_id;
  IF v_count >= 1 THEN
    INSERT INTO public.user_achievements (user_id, achievement_id, metadata)
    VALUES (p_user_id, 'first_diary', '{"name":"Prima Pagina","emoji":"📖","description":"Hai scritto la tua prima voce di diario"}'::jsonb)
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;

  -- 'first_exercise' → ha almeno 1 voce in user_exercise_sessions
  SELECT COUNT(*) INTO v_count FROM public.user_exercise_sessions WHERE user_id = p_user_id;
  IF v_count >= 1 THEN
    INSERT INTO public.user_achievements (user_id, achievement_id, metadata)
    VALUES (p_user_id, 'first_exercise', '{"name":"Primo Esercizio","emoji":"🧘","description":"Hai completato il tuo primo esercizio"}'::jsonb)
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;

  -- 'streak_7' → current_streak >= 7 in qualsiasi riga di habit_streaks
  SELECT MAX(current_streak) INTO v_val FROM public.habit_streaks WHERE user_id = p_user_id;
  IF v_val >= 7 THEN
    INSERT INTO public.user_achievements (user_id, achievement_id, metadata)
    VALUES (p_user_id, 'streak_7', '{"name":"Una Settimana!","emoji":"🔥","description":"Hai mantenuto una streak di 7 giorni"}'::jsonb)
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;

  -- 'streak_30' → current_streak >= 30
  IF v_val >= 30 THEN
    INSERT INTO public.user_achievements (user_id, achievement_id, metadata)
    VALUES (p_user_id, 'streak_30', '{"name":"Un Mese!","emoji":"🏆","description":"Hai mantenuto una streak di 30 giorni"}'::jsonb)
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;

  -- 'level_5' → current_level >= 5 in user_profiles
  SELECT current_level INTO v_val FROM public.user_profiles WHERE user_id = p_user_id;
  IF v_val >= 5 THEN
    INSERT INTO public.user_achievements (user_id, achievement_id, metadata)
    VALUES (p_user_id, 'level_5', '{"name":"Equilibrato","emoji":"⚖️","description":"Hai raggiunto il livello 5"}'::jsonb)
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;

  -- 'sessions_10' → COUNT sessions >= 10
  SELECT COUNT(*) INTO v_count FROM public.sessions WHERE user_id = p_user_id;
  IF v_count >= 10 THEN
    INSERT INTO public.user_achievements (user_id, achievement_id, metadata)
    VALUES (p_user_id, 'sessions_10', '{"name":"10 Sessioni","emoji":"🎯","description":"Hai completato 10 sessioni"}'::jsonb)
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;

  -- 'sessions_50' → COUNT sessions >= 50
  IF v_count >= 50 THEN
    INSERT INTO public.user_achievements (user_id, achievement_id, metadata)
    VALUES (p_user_id, 'sessions_50', '{"name":"50 Sessioni","emoji":"🌟","description":"Hai completato 50 sessioni"}'::jsonb)
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;

  -- 'checkins_30' → COUNT daily_checkins >= 30
  SELECT COUNT(*) INTO v_count FROM public.daily_checkins WHERE user_id = p_user_id;
  IF v_count >= 30 THEN
    INSERT INTO public.user_achievements (user_id, achievement_id, metadata)
    VALUES (p_user_id, 'checkins_30', '{"name":"30 Check-in","emoji":"📊","description":"Hai completato 30 check-in"}'::jsonb)
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;

  -- 'exercises_10' → COUNT user_exercise_sessions >= 10
  SELECT COUNT(*) INTO v_count FROM public.user_exercise_sessions WHERE user_id = p_user_id;
  IF v_count >= 10 THEN
    INSERT INTO public.user_achievements (user_id, achievement_id, metadata)
    VALUES (p_user_id, 'exercises_10', '{"name":"10 Esercizi","emoji":"💪","description":"Hai completato 10 esercizi"}'::jsonb)
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;

  -- 'voice_10' → COUNT sessions con type='voice' >= 10
  SELECT COUNT(*) INTO v_count FROM public.sessions WHERE user_id = p_user_id AND type = 'voice';
  IF v_count >= 10 THEN
    INSERT INTO public.user_achievements (user_id, achievement_id, metadata)
    VALUES (p_user_id, 'voice_10', '{"name":"10 Sessioni Vocali","emoji":"🎤","description":"Hai completato 10 sessioni vocali"}'::jsonb)
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;

  -- 'diary_30days' → diary_entries su 30 date distinte
  SELECT COUNT(DISTINCT entry_date) INTO v_count FROM public.diary_entries WHERE user_id = p_user_id;
  IF v_count >= 30 THEN
    INSERT INTO public.user_achievements (user_id, achievement_id, metadata)
    VALUES (p_user_id, 'diary_30days', '{"name":"30 Giorni di Diario","emoji":"📝","description":"Hai scritto il diario per 30 giorni diversi"}'::jsonb)
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;

  -- 'points_1000' → total_points >= 1000 in user_reward_points
  SELECT total_points INTO v_val FROM public.user_reward_points WHERE user_id = p_user_id;
  IF v_val >= 1000 THEN
    INSERT INTO public.user_achievements (user_id, achievement_id, metadata)
    VALUES (p_user_id, 'points_1000', '{"name":"1000 Punti","emoji":"💎","description":"Hai accumulato 1000 punti"}'::jsonb)
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;

  -- 'points_5000' → total_points >= 5000
  IF v_val >= 5000 THEN
    INSERT INTO public.user_achievements (user_id, achievement_id, metadata)
    VALUES (p_user_id, 'points_5000', '{"name":"5000 Punti","emoji":"👑","description":"Hai accumulato 5000 punti"}'::jsonb)
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;

END;
$$;
