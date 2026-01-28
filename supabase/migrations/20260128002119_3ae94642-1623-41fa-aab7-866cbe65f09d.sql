-- Tabella punti utente
CREATE TABLE IF NOT EXISTS user_reward_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  total_points INTEGER NOT NULL DEFAULT 0,
  lifetime_points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Storico transazioni punti
CREATE TABLE IF NOT EXISTS reward_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  points INTEGER NOT NULL,
  type TEXT NOT NULL,
  source_id TEXT,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sistema referral
CREATE TABLE IF NOT EXISTS user_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL,
  referred_id UUID NOT NULL,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  referred_active_days INTEGER DEFAULT 0,
  points_awarded BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Colonne aggiuntive user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS premium_until TIMESTAMPTZ;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS premium_type TEXT;

-- RLS per user_reward_points
ALTER TABLE user_reward_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own points" ON user_reward_points
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own points" ON user_reward_points
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own points" ON user_reward_points
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS per reward_transactions
ALTER TABLE reward_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON reward_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON reward_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS per user_referrals
ALTER TABLE user_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referrals as referrer" ON user_referrals
  FOR SELECT USING (auth.uid() = referrer_id);

CREATE POLICY "Users can view own referrals as referred" ON user_referrals
  FOR SELECT USING (auth.uid() = referred_id);

CREATE POLICY "Users can insert referrals" ON user_referrals
  FOR INSERT WITH CHECK (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- Funzione per generare codice referral
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Trigger per generare referral_code automaticamente
CREATE OR REPLACE FUNCTION set_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := public.generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_referral_code ON user_profiles;
CREATE TRIGGER trigger_set_referral_code
  BEFORE INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_referral_code();

-- Funzione per aggiungere punti
CREATE OR REPLACE FUNCTION add_reward_points(p_user_id UUID, p_points INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_reward_points (user_id, total_points, lifetime_points)
  VALUES (p_user_id, p_points, GREATEST(p_points, 0))
  ON CONFLICT (user_id) DO UPDATE SET
    total_points = user_reward_points.total_points + p_points,
    lifetime_points = user_reward_points.lifetime_points + GREATEST(p_points, 0),
    updated_at = now();
END;
$$;