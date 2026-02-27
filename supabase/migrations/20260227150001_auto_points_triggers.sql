-- =============================================
-- ARIA V2.0 - Auto Points Triggers
-- =============================================

-- Forward declaration: check_and_award_badges (defined in next migration)
-- This function will be called at the end of each trigger

-- =============================================
-- TRIGGER 1: award_points_checkin
-- After INSERT on daily_checkins
-- +5 points, +20 bonus if first ever check-in
-- =============================================

CREATE OR REPLACE FUNCTION public.trigger_award_points_checkin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_checkin_count INTEGER;
BEGIN
  -- Award 5 points for every check-in
  PERFORM public.add_reward_points(NEW.user_id, 5);

  -- Check if this is the first check-in ever for this user
  SELECT COUNT(*) INTO v_checkin_count
  FROM public.daily_checkins
  WHERE user_id = NEW.user_id;

  -- If count is 1, this is the first check-in → bonus 20 points
  IF v_checkin_count = 1 THEN
    PERFORM public.add_reward_points(NEW.user_id, 20);
  END IF;

  -- Check and award badges
  PERFORM public.check_and_award_badges(NEW.user_id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS award_points_checkin ON public.daily_checkins;
CREATE TRIGGER award_points_checkin
  AFTER INSERT ON public.daily_checkins
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_award_points_checkin();

-- =============================================
-- TRIGGER 2: award_points_session
-- After UPDATE on sessions
-- When status changes to 'completed'
-- chat with >3 messages: +15
-- voice: +25, first voice ever: +30 bonus
-- =============================================

CREATE OR REPLACE FUNCTION public.trigger_award_points_session()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message_count INTEGER;
  v_voice_count INTEGER;
BEGIN
  -- Only fire when status changes to 'completed'
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN

    -- Chat session with >3 messages
    IF NEW.type = 'chat' THEN
      SELECT COUNT(*) INTO v_message_count
      FROM public.chat_messages
      WHERE session_id = NEW.id;

      IF v_message_count > 3 THEN
        PERFORM public.add_reward_points(NEW.user_id, 15);
      END IF;
    END IF;

    -- Voice session
    IF NEW.type = 'voice' THEN
      PERFORM public.add_reward_points(NEW.user_id, 25);

      -- Check if this is the first voice session ever
      SELECT COUNT(*) INTO v_voice_count
      FROM public.sessions
      WHERE user_id = NEW.user_id
        AND type = 'voice'
        AND status = 'completed';

      -- If count is 1, this is the first completed voice session → bonus 30
      IF v_voice_count = 1 THEN
        PERFORM public.add_reward_points(NEW.user_id, 30);
      END IF;
    END IF;

    -- Check and award badges
    PERFORM public.check_and_award_badges(NEW.user_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS award_points_session ON public.sessions;
CREATE TRIGGER award_points_session
  AFTER UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_award_points_session();

-- =============================================
-- TRIGGER 3: award_points_diary
-- After INSERT on diary_entries
-- +10 points
-- =============================================

CREATE OR REPLACE FUNCTION public.trigger_award_points_diary()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Award 10 points for every diary entry
  PERFORM public.add_reward_points(NEW.user_id, 10);

  -- Check and award badges
  PERFORM public.check_and_award_badges(NEW.user_id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS award_points_diary ON public.diary_entries;
CREATE TRIGGER award_points_diary
  AFTER INSERT ON public.diary_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_award_points_diary();

-- =============================================
-- TRIGGER 4: check_streak_milestone
-- After UPDATE on habit_streaks
-- 7-day streak: +50 points
-- 30-day streak: +200 points
-- =============================================

CREATE OR REPLACE FUNCTION public.trigger_check_streak_milestone()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 7-day streak milestone
  IF NEW.current_streak = 7 AND OLD.current_streak = 6 THEN
    PERFORM public.add_reward_points(NEW.user_id, 50);
  END IF;

  -- 30-day streak milestone
  IF NEW.current_streak = 30 AND OLD.current_streak = 29 THEN
    PERFORM public.add_reward_points(NEW.user_id, 200);
  END IF;

  -- Check and award badges
  IF NEW.current_streak IN (7, 30) AND OLD.current_streak IN (6, 29) THEN
    PERFORM public.check_and_award_badges(NEW.user_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_streak_milestone ON public.habit_streaks;
CREATE TRIGGER check_streak_milestone
  AFTER UPDATE ON public.habit_streaks
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_check_streak_milestone();
