

# Piano: Profilo Rinnovato + Sistema Punti + Pagina Plus

## Panoramica

Questo piano implementa:
1. **Rimozione streak dalla Home** - Spostamento nella sezione Profilo
2. **Nuovo Profilo Premium** - Design rinnovato con streak, badge e punti
3. **Pagina Plus** - Abbonamento premium con features e pricing
4. **Sistema Punti** - Gamification per ottenere premium gratis

---

## 1. Struttura Database

### Nuove Tabelle

```sql
-- Tabella punti utente
CREATE TABLE user_reward_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_points INTEGER NOT NULL DEFAULT 0,
  lifetime_points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Storico transazioni punti
CREATE TABLE reward_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL, -- positivo = guadagno, negativo = spesa
  type TEXT NOT NULL, -- 'badge', 'streak', 'referral', 'premium_redemption'
  source_id TEXT, -- ID badge, referral_code, etc.
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sistema referral
CREATE TABLE user_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'active', 'completed'
  referred_active_days INTEGER DEFAULT 0,
  points_awarded BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Colonne aggiuntive user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS
  referral_code TEXT UNIQUE,
  premium_until TIMESTAMPTZ,
  premium_type TEXT; -- 'paid', 'points', null
```

### Punti Assegnati per Achievement

| Achievement ID | Punti | Descrizione |
|----------------|-------|-------------|
| `week_streak` | 100 | 7 giorni consecutivi |
| `month_streak` | 300 | 30 giorni consecutivi |
| `first_checkin` | 25 | Primo check-in |
| `first_session` | 50 | Prima sessione con Aria |
| `hundred_checkins` | 200 | 100 check-in completati |
| `hydration_master` | 75 | 7 giorni obiettivo acqua |
| `smoke_free_week` | 150 | 7 giorni senza sigarette |
| `smoke_free_month` | 400 | 30 giorni senza sigarette |
| `zen_master` | 100 | 30 sessioni meditazione |
| `balanced_life` | 250 | Tutte le aree sopra 6/10 |
| Referral completato | 400 | Amico usa app per 7 giorni |

---

## 2. Rimozione Streak dalla Home

### File: `src/pages/Index.tsx`

Rimuovere l'import e l'uso di `StreakCounter`:

```diff
- import StreakCounter from '@/components/home/StreakCounter';

// Nel return, rimuovere:
-        {/* Streak Counter */}
-        <div className="mt-4">
-          <StreakCounter />
-        </div>
```

---

## 3. Nuovo Profilo Premium

### Struttura Pagina Profilo

```
┌─────────────────────────────────────┐
│  👤 Nome Utente                     │
│  email@example.com                  │
│  🏷️ Free • Membro da gennaio 2026   │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  🔥 STREAK E STATISTICHE            │
│  ┌─────┐ ┌─────┐ ┌─────┐           │
│  │ 12  │ │ 35  │ │ 8   │           │
│  │giorni│ │sess.│ │badge│           │
│  └─────┘ └─────┘ └─────┘           │
│                                     │
│  Record: 45 giorni 🏆               │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  💎 I TUOI PUNTI                    │
│  ┌─────────────────────────────────┐│
│  │   1,250 punti                  ││
│  │   ████████████░░░░ 1,250/1000   ││
│  │   [Riscatta 1 mese Plus]       ││
│  └─────────────────────────────────┘│
│                                     │
│  Prossimo premio: -250 punti        │
│  Storico guadagni →                 │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  🏅 BADGE SBLOCCATI (5/16)          │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
│  │ 🏅 │ │ 🔥 │ │ 💧 │ │ 🧘 │   │
│  └─────┘ └─────┘ └─────┘ └─────┘   │
│  +12 altro →                        │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  👥 INVITA AMICI                    │
│  Condividi codice: ABC123XY         │
│  Guadagna 400 punti per amico!      │
│  [Condividi] [Copia]                │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  ⚙️ IMPOSTAZIONI                     │
│  ├─ Dati personali →                │
│  ├─ Notifiche →                     │
│  ├─ Privacy Aria →                  │
│  ├─ Area Terapeutica →              │
│  └─ Aiuto →                         │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  💳 ABBONAMENTO                     │
│  Piano Free                         │
│  [Passa a Plus] →                   │
└─────────────────────────────────────┘

[Esci]
```

### Nuovi Componenti

| File | Descrizione |
|------|-------------|
| `src/components/profile/StreakStatsCard.tsx` | Card streak con stats |
| `src/components/profile/RewardPointsCard.tsx` | Card punti con progresso |
| `src/components/profile/BadgesGrid.tsx` | Griglia badge con modal dettagli |
| `src/components/profile/ReferralCard.tsx` | Card invita amici |
| `src/components/profile/SubscriptionCard.tsx` | Card abbonamento |

### Nuovi Hooks

| File | Descrizione |
|------|-------------|
| `src/hooks/useRewardPoints.tsx` | Gestione punti utente |
| `src/hooks/useReferrals.tsx` | Gestione referral |

---

## 4. Pagina Plus (Premium)

### Route: `/plus`

### Design

```
┌─────────────────────────────────────┐
│            ✨ PLUS ✨                │
│     Sblocca il tuo potenziale       │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  🎁 FEATURES PREMIUM                 │
│                                     │
│  ✓ Sessioni illimitate con Aria     │
│  ✓ Report clinici avanzati          │
│  ✓ Analisi psicologiche approfondite│
│  ✓ Obiettivi personalizzati illim.  │
│  ✓ Export dati completo             │
│  ✓ Nessuna pubblicità               │
│  ✓ Supporto prioritario             │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  💳 SCEGLI COME PAGARE              │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ 💎 CON PUNTI                   ││
│  │ 1,000 punti = 1 mese Plus      ││
│  │                                ││
│  │ Hai: 1,250 punti               ││
│  │ [Riscatta 1 mese]              ││
│  └─────────────────────────────────┘│
│                                     │
│  ─────── oppure ───────             │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ 💰 ABBONAMENTO                 ││
│  │                                ││
│  │ Mensile: €4,99/mese            ││
│  │ Annuale: €39,99/anno (-33%)    ││
│  │                                ││
│  │ [Abbonati mensile]             ││
│  │ [Abbonati annuale] ⭐ Consig.  ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  🎯 COME GUADAGNARE PUNTI           │
│                                     │
│  🔥 7 giorni consecutivi = 100 pts  │
│  👥 Invita un amico = 400 pts       │
│  🏅 Sblocca badge = 25-400 pts      │
│  📊 100 check-in = 200 pts          │
└─────────────────────────────────────┘
```

### Pricing (Placeholder)

| Piano | Prezzo | Note |
|-------|--------|------|
| Mensile | €4,99/mese | Fatturato mensilmente |
| Annuale | €39,99/anno | -33% risparmio |
| Punti | 1,000 pts/mese | Cumulabile |

---

## 5. File da Creare

| File | Descrizione |
|------|-------------|
| `src/pages/Plus.tsx` | Pagina abbonamento premium |
| `src/hooks/useRewardPoints.tsx` | Hook gestione punti |
| `src/hooks/useReferrals.tsx` | Hook gestione referral |
| `src/components/profile/StreakStatsCard.tsx` | Card streak + stats |
| `src/components/profile/RewardPointsCard.tsx` | Card punti con progress bar |
| `src/components/profile/BadgesGrid.tsx` | Griglia badge sbloccati |
| `src/components/profile/BadgeDetailModal.tsx` | Modal dettaglio singolo badge |
| `src/components/profile/ReferralCard.tsx` | Card invita amici |
| `src/components/profile/SubscriptionCard.tsx` | Card stato abbonamento |
| `src/components/plus/FeaturesList.tsx` | Lista features premium |
| `src/components/plus/PointsRedemption.tsx` | Sezione riscatto punti |
| `src/components/plus/PricingOptions.tsx` | Opzioni abbonamento |

---

## 6. File da Modificare

| File | Modifica |
|------|----------|
| `src/pages/Index.tsx` | Rimuovere StreakCounter |
| `src/pages/Profile.tsx` | Completo redesign con nuovi componenti |
| `src/App.tsx` | Aggiungere route `/plus` |
| `src/hooks/useAchievements.tsx` | Aggiungere logica assegnazione punti quando badge sbloccato |
| `src/hooks/useProfile.tsx` | Aggiungere campi `referral_code`, `premium_until`, `premium_type` |
| `src/components/layout/BottomNav.tsx` | Link a Plus da abbonamento (opzionale) |

---

## 7. Logica Sistema Punti

### Assegnazione Automatica Punti

Quando un badge viene sbloccato (in `useAchievements.tsx`):

```typescript
// Mappa punti per badge
const BADGE_POINTS: Record<string, number> = {
  first_checkin: 25,
  week_streak: 100,
  month_streak: 300,
  first_session: 50,
  hundred_checkins: 200,
  // ... etc
};

// Nella mutation unlockAchievement
onSuccess: async (data, variables) => {
  const points = BADGE_POINTS[variables.achievementId];
  if (points) {
    await supabase.from('reward_transactions').insert({
      user_id: user.id,
      points: points,
      type: 'badge',
      source_id: variables.achievementId,
      description: `Badge ${ACHIEVEMENTS[variables.achievementId].title} sbloccato`
    });
    
    // Aggiorna totale
    await supabase.rpc('add_reward_points', { 
      p_user_id: user.id, 
      p_points: points 
    });
  }
}
```

### Riscatto Premium con Punti

```typescript
async function redeemPremiumWithPoints() {
  if (totalPoints < 1000) throw new Error('Punti insufficienti');
  
  // Scala 1000 punti
  await supabase.from('reward_transactions').insert({
    user_id: user.id,
    points: -1000,
    type: 'premium_redemption',
    description: '1 mese Plus riscattato'
  });
  
  // Calcola nuova scadenza
  const currentExpiry = profile.premium_until ? new Date(profile.premium_until) : new Date();
  const newExpiry = new Date(Math.max(currentExpiry.getTime(), Date.now()));
  newExpiry.setMonth(newExpiry.getMonth() + 1);
  
  await updateProfile({
    premium_until: newExpiry.toISOString(),
    premium_type: 'points'
  });
}
```

### Referral Flow

1. Ogni utente ha un `referral_code` univoco generato al signup
2. Amico si registra con codice → crea record in `user_referrals` con status `pending`
3. Cron job o trigger verifica dopo 7 giorni se amico ha usato app
4. Se 7 giorni attivi → status `completed` → 400 punti al referrer

---

## 8. Generazione Codice Referral

Database function:

```sql
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
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
```

---

## 9. Sequenza Implementazione

1. **Database Migration** - Creare tabelle `user_reward_points`, `reward_transactions`, `user_referrals` + colonne `user_profiles`
2. **Hook useRewardPoints** - CRUD punti e transazioni
3. **Hook useReferrals** - Gestione codici e inviti
4. **Modifica useAchievements** - Assegnazione automatica punti
5. **Componenti Profile** - StreakStatsCard, RewardPointsCard, BadgesGrid, ReferralCard
6. **Pagina Profile** - Redesign completo
7. **Pagina Plus** - Features, pricing, riscatto punti
8. **Rimozione StreakCounter da Home**
9. **Route App.tsx** - Aggiungere `/plus`

---

## 10. Dettagli Tecnici

### RLS Policies

```sql
-- user_reward_points: solo proprio record
ALTER TABLE user_reward_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own points" ON user_reward_points
  FOR SELECT USING (auth.uid() = user_id);

-- reward_transactions: solo proprie transazioni
ALTER TABLE reward_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own transactions" ON reward_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- user_referrals: referrer e referred possono vedere
ALTER TABLE user_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own referrals" ON user_referrals
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);
```

### Stile Componenti (Premium 2025)

- Card: `bg-card rounded-3xl border border-border/50 shadow-premium p-6`
- Titoli: `font-display text-lg font-semibold text-foreground`
- Stats numbers: `text-3xl font-bold text-primary`
- Progress bar: `bg-primary/20` con fill `bg-gradient-to-r from-primary to-purple-500`
- Badge grid: `grid grid-cols-4 gap-3`
- CTA buttons: `bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl`

