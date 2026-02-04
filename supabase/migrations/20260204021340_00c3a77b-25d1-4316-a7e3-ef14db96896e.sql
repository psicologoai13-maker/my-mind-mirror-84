-- ═══════════════════════════════════════════════════════════════
-- FASE 2: Aggiunta Nuove Metriche Cliniche (~25 nuove colonne)
-- ═══════════════════════════════════════════════════════════════

-- === DAILY_EMOTIONS: Aggiunta 6 emozioni mancanti ===
ALTER TABLE public.daily_emotions
ADD COLUMN IF NOT EXISTS disgust integer,
ADD COLUMN IF NOT EXISTS surprise integer,
ADD COLUMN IF NOT EXISTS serenity integer,
ADD COLUMN IF NOT EXISTS pride integer,
ADD COLUMN IF NOT EXISTS affection integer,
ADD COLUMN IF NOT EXISTS curiosity integer;

-- === DAILY_PSYCHOLOGY: Aggiunta indicatori di sicurezza (CRITICI) ===
ALTER TABLE public.daily_psychology
ADD COLUMN IF NOT EXISTS suicidal_ideation integer,
ADD COLUMN IF NOT EXISTS hopelessness integer,
ADD COLUMN IF NOT EXISTS self_harm_urges integer;

-- === DAILY_PSYCHOLOGY: Aggiunta metriche cognitive ===
ALTER TABLE public.daily_psychology
ADD COLUMN IF NOT EXISTS dissociation integer,
ADD COLUMN IF NOT EXISTS confusion integer,
ADD COLUMN IF NOT EXISTS racing_thoughts integer;

-- === DAILY_PSYCHOLOGY: Aggiunta metriche comportamentali ===
ALTER TABLE public.daily_psychology
ADD COLUMN IF NOT EXISTS avoidance integer,
ADD COLUMN IF NOT EXISTS social_withdrawal integer,
ADD COLUMN IF NOT EXISTS compulsive_urges integer,
ADD COLUMN IF NOT EXISTS procrastination integer;

-- === DAILY_PSYCHOLOGY: Aggiunta risorse personali ===
ALTER TABLE public.daily_psychology
ADD COLUMN IF NOT EXISTS sense_of_purpose integer,
ADD COLUMN IF NOT EXISTS life_satisfaction integer,
ADD COLUMN IF NOT EXISTS perceived_social_support integer,
ADD COLUMN IF NOT EXISTS emotional_regulation integer,
ADD COLUMN IF NOT EXISTS resilience integer,
ADD COLUMN IF NOT EXISTS mindfulness integer;

-- === DAILY_LIFE_AREAS: Aggiunta 3 nuove aree ===
ALTER TABLE public.daily_life_areas
ADD COLUMN IF NOT EXISTS family integer,
ADD COLUMN IF NOT EXISTS leisure integer,
ADD COLUMN IF NOT EXISTS finances integer;

-- === Commenti per documentazione clinica ===
COMMENT ON COLUMN public.daily_psychology.suicidal_ideation IS 'CRITICO: Pensieri suicidari (1-10). Alert se > 5';
COMMENT ON COLUMN public.daily_psychology.hopelessness IS 'CRITICO: Disperazione (1-10). Alert se > 7';
COMMENT ON COLUMN public.daily_psychology.self_harm_urges IS 'CRITICO: Impulsi autolesionistici (1-10). Alert se > 5';
COMMENT ON COLUMN public.daily_psychology.dissociation IS 'Dissociazione - importante per trauma';
COMMENT ON COLUMN public.daily_psychology.avoidance IS 'Evitamento - core dell''ansia';
COMMENT ON COLUMN public.daily_life_areas.family IS 'Relazioni familiari - distinto da amore romantico';
COMMENT ON COLUMN public.daily_life_areas.leisure IS 'Tempo libero - importante per burnout';
COMMENT ON COLUMN public.daily_life_areas.finances IS 'Situazione economica - fonte di stress';