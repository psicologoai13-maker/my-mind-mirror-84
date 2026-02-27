-- =============================================
-- ARIA V2.0 - Gamification V2 (Livelli)
-- =============================================

-- Tabella livelli gamification
CREATE TABLE IF NOT EXISTS public.gamification_levels (
  level INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT,
  points_required INTEGER NOT NULL,
  description TEXT,
  badge_id TEXT
);

-- Popola i 10 livelli
INSERT INTO public.gamification_levels (level, name, emoji, points_required, description, badge_id) VALUES
  (1,  'Esploratore',  '🧭', 0,     'Hai iniziato il tuo viaggio interiore',                'explorer'),
  (2,  'Curioso',      '🔍', 200,   'La curiosità è il primo passo verso la consapevolezza', 'curious'),
  (3,  'Consapevole',  '🌱', 600,   'Stai coltivando la tua consapevolezza emotiva',         'aware'),
  (4,  'Riflessivo',   '🪞', 1200,  'Hai imparato a riflettere prima di reagire',            'reflective'),
  (5,  'Equilibrato',  '⚖️', 2500,  'Hai trovato un equilibrio interiore',                   'balanced'),
  (6,  'Resiliente',   '🛡️', 4500,  'Le difficoltà non ti abbattono più',                    'resilient'),
  (7,  'Sereno',       '☀️', 7500,  'La serenità è diventata il tuo stato naturale',         'serene'),
  (8,  'Saggio',       '🦉', 12000, 'La saggezza guida le tue scelte',                       'wise'),
  (9,  'Maestro',      '🎓', 20000, 'Sei diventato maestro della tua mente',                 'master'),
  (10, 'Risvegliato',  '✨', 35000, 'Hai raggiunto la piena consapevolezza di te stesso',    'awakened');

-- Aggiungi colonna current_level a user_profiles (se non esiste)
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS current_level INTEGER DEFAULT 1;

-- Funzione per calcolare il livello utente
CREATE OR REPLACE FUNCTION public.calculate_user_level(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_points INTEGER;
  v_level INTEGER;
BEGIN
  -- Leggi total_points da user_reward_points
  SELECT COALESCE(total_points, 0) INTO v_total_points
  FROM public.user_reward_points
  WHERE user_id = p_user_id;

  -- Se non esiste record, livello 1
  IF v_total_points IS NULL THEN
    RETURN 1;
  END IF;

  -- Trova il livello massimo raggiunto
  SELECT COALESCE(MAX(level), 1) INTO v_level
  FROM public.gamification_levels
  WHERE points_required <= v_total_points;

  RETURN v_level;
END;
$$;

-- Trigger su user_reward_points: aggiorna current_level dopo UPDATE
CREATE OR REPLACE FUNCTION public.update_user_level_on_points_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_level INTEGER;
BEGIN
  -- Calcola il nuovo livello
  v_new_level := public.calculate_user_level(NEW.user_id);

  -- Aggiorna user_profiles
  UPDATE public.user_profiles
  SET current_level = v_new_level
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_user_level ON public.user_reward_points;
CREATE TRIGGER trigger_update_user_level
  AFTER INSERT OR UPDATE ON public.user_reward_points
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_level_on_points_change();
