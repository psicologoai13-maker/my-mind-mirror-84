
# Piano: Sistema Interessi & Preferenze Utente - Profilazione Contestuale

## Obiettivo
Raccogliere interessi statici dell'utente per permettere ad Aria di:
1. Collegare eventi esterni (notizie, risultati sportivi, eventi) all'umore dell'utente
2. Personalizzare conversazioni con riferimenti specifici
3. Capire il contesto emotivo dietro certi stati d'animo

---

## PARTE 1: Categorie Interessi da Raccogliere

### 1.1 SPORT (sport_interests)
| Campo | Tipo | Descrizione | Esempio |
|-------|------|-------------|---------|
| follows_football | boolean | Segue calcio | true |
| favorite_teams | text[] | Squadre del cuore | ["Juventus", "Italia"] |
| favorite_athletes | text[] | Atleti preferiti | ["Sinner", "Verstappen"] |
| sports_followed | text[] | Sport seguiti | ["calcio", "tennis", "F1", "basket"] |

**USO CONTESTUALE:**
- News: "Juventus perde 3-0" + utente nervoso → Aria: "Ho visto la partita della Juve... giornata dura, eh?"
- News: "Sinner vince Australian Open" → Aria: "Hai visto Jannik?! Che partita!"

### 1.2 INTRATTENIMENTO (entertainment_interests)
| Campo | Tipo | Descrizione | Esempio |
|-------|------|-------------|---------|
| favorite_genres | text[] | Generi preferiti | ["thriller", "sci-fi", "commedia"] |
| current_shows | text[] | Serie che sta guardando | ["The Bear", "Succession"] |
| favorite_artists | text[] | Artisti musicali | ["Coldplay", "Måneskin"] |
| music_genres | text[] | Generi musicali | ["rock", "pop", "classica"] |
| podcasts | text[] | Podcast seguiti | ["Muschio Selvaggio"] |
| gaming_interests | text[] | Giochi/piattaforme | ["PS5", "FIFA", "RPG"] |

**USO CONTESTUALE:**
- Utente stanco → Aria: "Hai visto l'ultima puntata di The Bear? Perfetta per staccare!"
- News: "Nuova stagione di X annunciata" → Aria menziona se è nella lista utente

### 1.3 LAVORO & INTERESSI PROFESSIONALI (work_interests)
| Campo | Tipo | Descrizione | Esempio |
|-------|------|-------------|---------|
| industry | text | Settore lavorativo | "tech", "healthcare", "finance" |
| role_type | text | Tipo ruolo | "manager", "creative", "technical" |
| professional_interests | text[] | Interessi professionali | ["AI", "startups", "marketing"] |
| career_goals | text[] | Aspirazioni | ["promozione", "cambio carriera"] |

**USO CONTESTUALE:**
- News su tech layoffs + utente nel tech ansioso → Aria capisce il contesto
- Aria può chiedere follow-up su progetti menzionati

### 1.4 LIFESTYLE & VALORI (lifestyle_values)
| Campo | Tipo | Descrizione | Esempio |
|-------|------|-------------|---------|
| pet_owner | boolean | Ha animali | true |
| pets | jsonb | Dettagli animali | [{"type": "dog", "name": "Luna"}] |
| dietary_preferences | text[] | Preferenze alimentari | ["vegetariano", "no latticini"] |
| values | text[] | Valori importanti | ["famiglia", "ambiente", "carriera"] |
| political_interest | boolean | Interesse politica | false |
| religion_spirituality | text | Spiritualità | "praticante", "spirituale", "ateo", null |

**USO CONTESTUALE:**
- "Come sta Luna oggi?" (ricorda nome animale)
- Non proporre ristoranti carne se vegetariano
- News politiche → menziona solo se `political_interest = true`

### 1.5 HOBBY & ATTIVITÀ (hobbies)
| Campo | Tipo | Descrizione | Esempio |
|-------|------|-------------|---------|
| creative_hobbies | text[] | Hobby creativi | ["fotografia", "cucina", "disegno"] |
| outdoor_activities | text[] | Attività outdoor | ["trekking", "camping", "mare"] |
| indoor_activities | text[] | Attività indoor | ["lettura", "gaming", "puzzle"] |
| learning_interests | text[] | Cosa vuole imparare | ["chitarra", "spagnolo", "coding"] |
| travel_style | text | Stile viaggi | "avventura", "relax", "cultura", "budget" |
| dream_destinations | text[] | Mete desiderate | ["Giappone", "Islanda", "New York"] |

### 1.6 RELAZIONI & SOCIALE (social_context)
| Campo | Tipo | Descrizione | Esempio |
|-------|------|-------------|---------|
| relationship_status | text | Stato relazionale | "single", "relazione", "sposato" |
| has_children | boolean | Ha figli | false |
| children_count | integer | Numero figli | 0 |
| living_situation | text | Situazione abitativa | "solo", "coinquilini", "famiglia" |
| social_preference | text | Preferenza sociale | "introverso", "estroverso", "ambivert" |

---

## PARTE 2: Struttura Database

### Opzione A: Nuova Tabella Dedicata (RACCOMANDATO)
```sql
CREATE TABLE user_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Sport
  follows_football boolean DEFAULT false,
  favorite_teams text[] DEFAULT '{}',
  favorite_athletes text[] DEFAULT '{}',
  sports_followed text[] DEFAULT '{}',
  
  -- Entertainment
  favorite_genres text[] DEFAULT '{}',
  current_shows text[] DEFAULT '{}',
  favorite_artists text[] DEFAULT '{}',
  music_genres text[] DEFAULT '{}',
  podcasts text[] DEFAULT '{}',
  gaming_interests text[] DEFAULT '{}',
  
  -- Work
  industry text,
  role_type text,
  professional_interests text[] DEFAULT '{}',
  
  -- Lifestyle
  pet_owner boolean DEFAULT false,
  pets jsonb DEFAULT '[]',
  dietary_preferences text[] DEFAULT '{}',
  values text[] DEFAULT '{}',
  political_interest boolean DEFAULT false,
  religion_spirituality text,
  
  -- Hobbies
  creative_hobbies text[] DEFAULT '{}',
  outdoor_activities text[] DEFAULT '{}',
  indoor_activities text[] DEFAULT '{}',
  learning_interests text[] DEFAULT '{}',
  travel_style text,
  dream_destinations text[] DEFAULT '{}',
  
  -- Social
  relationship_status text,
  has_children boolean DEFAULT false,
  children_count integer DEFAULT 0,
  living_situation text,
  social_preference text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their interests" ON user_interests
  FOR ALL USING (auth.uid() = user_id);
```

---

## PARTE 3: Raccolta Dati - Multi-Canale

### 3.1 Onboarding (Nuovo Step Opzionale)
**Step "Interessi" dopo "Lifestyle":**
- Chip multi-select per sport seguiti
- Input testo per squadra del cuore
- Chip per generi intrattenimento
- Quick picks per hobby principali

### 3.2 Pagina Profilo Dedicata "I Miei Interessi"
- Sezione accessibile da Profilo
- Form completo diviso per categorie
- L'utente può aggiornare quando vuole
- Suggerimenti: "Dici ad Aria che squadra tifi così può festeggiare con te!"

### 3.3 Estrazione da Aria (Passivo)
Aria può rilevare e chiedere conferma:
- "Ho notato che segui il calcio, che squadra tifi?"
- "Stai guardando qualche serie interessante?"
- Salva in long_term_memory prima, poi sincronizza

---

## PARTE 4: Integrazione Aria + News

### 4.1 Nuovo Blocco Contesto per Aria
```text
═══════════════════════════════════════════════
🎯 INTERESSI UTENTE
═══════════════════════════════════════════════

SPORT: Tifa Juventus, Inter (campionato), segue F1 e tennis
SQUADRE CUORE: Juventus (calcio), Ferrari (F1)
ATLETI: Sinner, Leclerc
SERIE TV IN CORSO: The Bear, Succession  
MUSICA: Rock, Coldplay, Måneskin
HOBBY: Fotografia, trekking, gaming (PS5)
LAVORO: Tech industry, software developer
VALORI: Carriera, crescita personale
ANIMALI: Cane chiamato Luna
DIETA: Nessuna restrizione

USO:
- Se nelle NEWS c'è "Juventus perde" e l'utente sembra giù → collega!
- Se parla di weekend → proponi trekking/fotografia
- Usa i nomi (Luna, squadre) per personalizzare
═══════════════════════════════════════════════
```

### 4.2 Logica Matching News ↔ Interessi
```typescript
function matchNewsToInterests(news: string[], interests: UserInterests): string[] {
  const relevantNews: string[] = [];
  
  news.forEach(headline => {
    const lowerHeadline = headline.toLowerCase();
    
    // Match squadre
    interests.favorite_teams?.forEach(team => {
      if (lowerHeadline.includes(team.toLowerCase())) {
        relevantNews.push(`[🏆 ${team}] ${headline}`);
      }
    });
    
    // Match atleti
    interests.favorite_athletes?.forEach(athlete => {
      if (lowerHeadline.includes(athlete.toLowerCase())) {
        relevantNews.push(`[⭐ ${athlete}] ${headline}`);
      }
    });
    
    // Match industry (se politica = true)
    if (interests.industry && lowerHeadline.includes(interests.industry)) {
      relevantNews.push(`[💼 Settore] ${headline}`);
    }
  });
  
  return relevantNews;
}
```

---

## PARTE 5: Altre Idee per Profilazione Avanzata

### 5.1 Contesto Temporale Personale
| Campo | Descrizione | Uso |
|-------|-------------|-----|
| work_schedule | "9-18", "turni", "freelance" | Sapere quando è disponibile/stressato |
| commute_time | Tempo commute giornaliero | "Come è andato il viaggio oggi?" |
| important_dates | Compleanni, anniversari | Ricordare e festeggiare |
| recurring_events | "Palestra lunedì", "Terapia giovedì" | Contesto settimanale |

### 5.2 Preferenze Comunicazione
| Campo | Descrizione | Uso |
|-------|-------------|-----|
| nickname | Come vuole essere chiamato | Personalizzazione |
| humor_preference | "sarcastico", "gentile", "misto" | Adattare stile Aria |
| response_length | "brevi", "dettagliate" | Calibrare risposte |
| emoji_preference | "molti", "pochi", "nessuno" | Stile messaggi |

### 5.3 Sensibilità & Trigger (Opzionale/Sensibile)
| Campo | Descrizione | Uso |
|-------|-------------|-----|
| sensitive_topics | ["perdita lavoro", "ex partner"] | Evitare trigger involontari |
| preferred_topics | ["futuro", "viaggi", "hobby"] | Safe topics per distrazione |
| news_sensitivity | "solo positive", "tutto", "nessuna" | Filtrare news |

---

## PARTE 6: Riepilogo Implementazione

### File da Creare/Modificare:
| File | Azione |
|------|--------|
| `supabase/migrations/xxx_user_interests.sql` | Nuova tabella |
| `src/hooks/useUserInterests.tsx` | Hook CRUD |
| `src/components/onboarding/InterestsStep.tsx` | Step onboarding |
| `src/components/profile/InterestsSection.tsx` | Sezione profilo |
| `supabase/functions/ai-chat/index.ts` | Blocco contesto interessi |
| `supabase/functions/real-time-context/index.ts` | Match news-interessi |

### Ordine Esecuzione:
1. Migrazione DB (tabella `user_interests`)
2. Hook `useUserInterests`
3. Step Onboarding (opzionale, veloce)
4. Pagina Profilo completa
5. Integrazione Aria (contesto + estrazione passiva)
6. News matching

---

## TOTALE NUOVI VALORI PROFILAZIONE

| Categoria | Campi | Tipo |
|-----------|-------|------|
| Sport | 4 | Statici |
| Entertainment | 6 | Statici |
| Work | 3 | Statici |
| Lifestyle | 6 | Statici |
| Hobbies | 6 | Statici |
| Social | 5 | Statici |
| Comunicazione | 4 | Preferenze |
| Temporali | 4 | Contesto |
| Sensibilità | 3 | Safety |
| **TOTALE** | **41** | **Nuovi campi** |

**PROFILAZIONE TOTALE:** 63 (metriche) + 41 (interessi) = **104 punti dati utente**

---

## Esempio Pratico: Scenario Juventus

```text
CONTESTO:
- User interests: favorite_teams = ["Juventus"]
- News di oggi: "Juventus perde 3-0 contro Inter nel derby d'Italia"
- Utente scrive: "Giornata di merda"

ARIA (con sistema attuale):
"Mi dispiace sentire questo. Cosa è successo?"

ARIA (con sistema interessi):
"Uff, immagino che la partita non abbia aiutato... 3-0 brucia 😔 
Vuoi parlare della giornata o preferisci pensare ad altro?"

→ L'utente si sente CAPITO senza dover spiegare
```
