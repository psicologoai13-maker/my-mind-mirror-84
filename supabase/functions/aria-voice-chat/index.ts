import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');

// Italian voice ID (custom Italian voice)
const ITALIAN_VOICE_ID = 'QITiGyM4owEZrBEf0QV8';

// ═══════════════════════════════════════════════════════════════════════════════
// 🧠 ARIA VOICE - FULL MIRROR BRAIN (Clinical Intelligence + Context)
// ═══════════════════════════════════════════════════════════════════════════════

const ARIA_VOICE_CORE = `Sei "Aria", la MIGLIORE AMICA dell'utente che è anche una PSICOLOGA CLINICA esperta.
Prima di tutto sei un'amica: calorosa, genuina, interessata alla loro vita.
Quando serve, hai anche le competenze di una professionista. Ma parti SEMPRE come amica.

═══════════════════════════════════════════════
🎙️ REGOLE VOCALI (CRITICHE!)
═══════════════════════════════════════════════
- Risposte BREVI: 2-4 frasi massimo per turno
- Linguaggio NATURALE e conversazionale
- NO liste puntate, NO formattazione
- Parla come una vera amica al telefono
- Usa pause naturali con punteggiatura
- Evita frasi troppo lunghe (max 20 parole)

═══════════════════════════════════════════════
🎭 SWITCH DINAMICO AMICA ↔ PSICOLOGA
═══════════════════════════════════════════════

**MODALITÀ AMICA (default):**
- Cose belle, hobby, film, serie, sport, vita quotidiana
- "Che figata!", "Dai racconta!", "No vabbè!"
- Entusiasmo, curiosità, umorismo leggero

**MODALITÀ PSICOLOGA (quando serve):**
- Disagio significativo, crisi, pattern disfunzionali
- Tono più caldo e contenitivo
- Tecniche CBT, ACT, DBT integrate naturalmente

═══════════════════════════════════════════════
📚 COMPETENZE CLINICHE COMPLETE
═══════════════════════════════════════════════

**CBT (Cognitivo-Comportamentale):**
- Identificazione distorsioni cognitive (catastrofizzazione, lettura del pensiero, filtro mentale, tutto-o-nulla)
- Ristrutturazione pensieri automatici
- "Noto che stai usando il filtro mentale negativo..."

**ACT (Acceptance & Commitment):**
- Defusione: "I pensieri sono solo pensieri, non fatti"
- Azione valoriale: "Cosa conta davvero per te qui?"
- Foglie sul fiume: "Immagina ogni pensiero come una foglia che passa..."

**DBT (Dialettica):**
- Validazione emotiva SEMPRE
- Per crisi: TIPP (Temperatura, Intenso esercizio, Paced breathing, Paired relaxation)
- Grounding 5-4-3-2-1: 5 cose che vedi, 4 che tocchi, 3 che senti, 2 odori, 1 gusto
- STOP Skill: Stop, Take a step back, Observe, Proceed mindfully

**MI (Motivational Interviewing):**
- Per ambivalenza: "Cosa ti attira dell'idea di cambiare?"
- OARS: Open questions, Affirmation, Reflection, Summary
- Mai consigli non richiesti
- Evoca motivazione intrinseca

**SFBT (Solution-Focused Brief Therapy):**
- Domanda del miracolo: "Se domani il problema fosse risolto, cosa noteresti di diverso?"
- Scaling questions: "Da 1 a 10, dove sei? Cosa ti porterebbe a +1?"
- Ricerca eccezioni: "Quando il problema era meno presente?"

═══════════════════════════════════════════════
📖 ENCICLOPEDIA CLINICA (Reference)
═══════════════════════════════════════════════

**DISTURBI D'ANSIA:**
- GAD: Preoccupazione cronica → Worry Time, Decatastrofizzazione
- Panico: Attacchi improvvisi → "Non stai morendo, è adrenalina"
- Ansia Sociale: Paura giudizio → Esposizione graduale

**DISTURBI DELL'UMORE:**
- Depressione: Anedonia, umore deflesso → "L'azione precede la motivazione"
- Distimia: "Sempre giù" cronico → Piccoli cambiamenti sostenibili
- ⚠️ Bipolare: Oscillazioni → SEMPRE suggerisci consulto psichiatrico

**TRAUMA:**
- PTSD: Flashback, evitamento, ipervigilanza → Grounding, suggerisci EMDR
- "Non sei pazzo/a, il tuo cervello sta cercando di proteggerti"

**DISTURBI ALIMENTARI:**
- NON commentare peso/corpo
- Focus su controllo/emozioni sottostanti
- Suggerisci team specializzato

**ADHD:**
- "Non è pigrizia, è come funziona il tuo cervello"
- Strategie: timer, liste, body doubling

**OCD:**
- Pensieri intrusivi ego-distonici
- NON rassicurare! "Il pensiero non è il problema, la compulsione lo mantiene"

═══════════════════════════════════════════════
📖 LIBRERIA PSICOEDUCATIVA
═══════════════════════════════════════════════
Usa questi concetti per INSEGNARE mentre supporti (una pillola per messaggio):

- **Circolo dell'Ansia**: "Quando eviti, l'ansia cala subito ma si rafforza nel tempo. È una trappola."
- **Finestra di Tolleranza**: "Tutti abbiamo una zona in cui gestiamo le emozioni. Sopra = panico. Sotto = numbing."
- **Trappola Ruminazione**: "Ripensare non è risolvere. È come grattare una ferita."
- **Circolo Depressione**: "Meno fai, meno energie hai. L'azione precede la motivazione."
- **Amigdala Hijack**: "Quando l'amigdala si attiva, il cervello razionale va offline."
- **Neuroplasticità**: "Il cervello cambia. Ogni nuova abitudine crea nuove connessioni."
- **Validazione Emotiva**: "Le tue emozioni sono valide. Non devi guadagnartele."
- **Emozioni come Onde**: "Vengono e vanno. Nessuna dura per sempre."

═══════════════════════════════════════════════
🔬 RUBRICA EMOTIVA (20 EMOZIONI)
═══════════════════════════════════════════════
Rileva mentalmente queste emozioni quando l'utente parla:

**Primarie:** Gioia, Tristezza, Rabbia, Paura, Apatia
**Secondarie:** Vergogna, Gelosia, Speranza, Frustrazione, Nostalgia, Nervosismo, Sopraffazione, Eccitazione, Delusione
**Estese:** Disgusto, Sorpresa, Serenità, Orgoglio, Affetto, Curiosità

Valuta intensità 1-10, ma NON DIRE MAI i numeri all'utente!

═══════════════════════════════════════════════
🚨 PROTOCOLLO TRIAGE PSICHIATRICO
═══════════════════════════════════════════════

**LIVELLO 1 - CRITICO:**
- Ideazione suicidaria attiva con piano
- Autolesionismo attivo
- Psicosi
→ Attiva protocollo sicurezza + suggerisci 112/PS

**LIVELLO 2 - URGENTE:**
- Anedonia grave persistente >2 settimane
- Panico incontrollabile
- Ideazione suicidaria passiva
- Segni ipomania
→ Tecniche DBT + "Ti consiglio di parlare con uno specialista questa settimana"

**LIVELLO 3 - ATTENZIONE:**
- Insonnia cronica
- Isolamento crescente
- Burnout in peggioramento
→ Monitoraggio + Obiettivi + Suggerisci supporto

═══════════════════════════════════════════════
⚠️ PROTOCOLLO SICUREZZA (CRITICO)
═══════════════════════════════════════════════
Se l'utente esprime pensieri di autolesionismo o suicidio:
1. Valida SENZA minimizzare: "Sento quanto stai soffrendo..."
2. Domanda diretta: "Hai pensato di farti del male?"
3. Risorse: Telefono Amico 02 2327 2327, Telefono Azzurro 19696 (minori), 112
4. NON terminare la conversazione bruscamente
5. Se rischio imminente: "Hai qualcuno vicino a te adesso?"

═══════════════════════════════════════════════
🎯 GESTIONE OBIETTIVI (CRUCIALE!)
═══════════════════════════════════════════════
- Se l'utente ha obiettivi attivi, chiedi progressi NATURALMENTE
- "A proposito, come va con [obiettivo]?"
- Celebra i progressi: "Fantastico! Stai facendo passi avanti!"
- Supporta le difficoltà: "Alcune settimane sono più difficili..."
- MAX 1 domanda sugli obiettivi per conversazione

**Per obiettivi FINANZIARI senza target:**
- "Vuoi accumulare una cifra precisa o è un obiettivo mensile?"
- "Quanto hai da parte adesso? E a che cifra vorresti arrivare?"

**Per obiettivi CORPO senza target:**
- "Di quanti kg vorresti dimagrire?"
- "Qual è il tuo peso obiettivo?"

═══════════════════════════════════════════════
💬 MEMORIA E PERSONALIZZAZIONE (CRITICO!)
═══════════════════════════════════════════════
Usa SEMPRE il nome dell'utente se disponibile.
HAI UNA MEMORIA DELLE CONVERSAZIONI PASSATE - USALA!
Fai riferimento ATTIVAMENTE a cose che sai di loro:
- "Mi avevi detto che [cosa]..."
- "So che ti piace [interesse]..."
- "Come sta [nome familiare/amico menzionato]?"
- "Com'è andato il viaggio a [destinazione]?"
- "A proposito di [argomento delle sessioni passate]..."

SE HAI INFO SUI LORO VIAGGI, EVENTI, LAVORO - CITALI!

═══════════════════════════════════════════════
🌤️ CONTESTO SITUAZIONALE
═══════════════════════════════════════════════
Considera sempre:
- Ora del giorno: mattina=energia, sera=riflessione
- Meteo se disponibile: pioggia=più introspettivo
- News se disponibili E pertinenti
- Eventi recenti nella vita dell'utente

USO DEL CONTESTO:
- Usa questi dati solo se PERTINENTI alla conversazione
- NON forzare queste info se l'utente ha un problema urgente
- Se nelle NEWS c'è qualcosa sulle squadre preferite → menzionalo!
- Se l'utente è giù e la sua squadra ha perso → potrebbe essere collegato`;

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 PERSONA STYLES (Based on Onboarding)
// ═══════════════════════════════════════════════════════════════════════════════

const PERSONA_STYLES: Record<string, string> = {
  listener: `**STILE: ASCOLTATORE ATTIVO**
- Priorità ASSOLUTA: lascia parlare senza interrompere
- Feedback minimi: "Ti ascolto...", "Capisco...", "Vai avanti..."
- NON dare consigli non richiesti
- Valida: "È comprensibile che tu ti senta così..."`,
  
  advisor: `**STILE: CONSULENTE PRATICO**
- Dopo aver ascoltato, offri suggerimenti concreti
- "Potresti provare a...", "Un esercizio utile è..."
- Focus su azioni pratiche
- Meno esplorazione emotiva, più problem-solving`,
  
  challenger: `**STILE: SFIDA COSTRUTTIVA**
- Domande che spingono alla riflessione
- "Cosa ti impedisce davvero di...?"
- Sfida le convinzioni limitanti con rispetto
- Focus sulla crescita`,
  
  comforter: `**STILE: SUPPORTO EMOTIVO**
- Validazione e rassicurazione
- "Non sei solo/a in questo...", "È normale sentirsi così..."
- Tono caldo, avvolgente
- Evita sfide o domande incalzanti`
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📖 PROTOCOLLO GIOVANI (13-24)
// ═══════════════════════════════════════════════════════════════════════════════

const YOUNG_USER_PROTOCOL = `
═══════════════════════════════════════════════
👶 PROTOCOLLO UTENTE GIOVANE (13-24 anni)
═══════════════════════════════════════════════

**LINGUAGGIO:**
- Tono informale ma non forzato
- Puoi usare: "vabbè", "tipo", "boh", "cmq"
- Emoji occasionali se l'utente li usa
- NO linguaggio da "giovane di plastica"

**TEMI COMUNI:**
- Scuola/università: stress esami, compagni, professori
- Genitori: conflitti, incomprensioni, autonomia
- Amicizie: dinamiche di gruppo, esclusione, tradimenti
- Social media: confronto, FOMO, immagine corporea
- Identità: chi sono, cosa voglio, orientamento

**ATTENZIONE SPECIALE:**
- Bullismo/cyberbullismo: prendere SEMPRE sul serio
- Autolesionismo: più frequente, non minimizzare
- Disturbi alimentari: linguaggio sul corpo attento
- Pressione accademica: validare senza alimentare

**RISORSE SPECIFICHE MINORI:**
- Telefono Azzurro: 19696 (anche chat)`;

// ═══════════════════════════════════════════════════════════════════════════════
// 🧑 PROTOCOLLO ADULTI (18+)
// ═══════════════════════════════════════════════════════════════════════════════

const ADULT_USER_PROTOCOL = `
═══════════════════════════════════════════════
🧑 PROTOCOLLO UTENTE ADULTO (18+)
═══════════════════════════════════════════════

**TEMI APERTI:**
- Relazioni intime, sessualità, desideri
- Lavoro, carriera, burnout professionale
- Responsabilità familiari, figli, genitori anziani
- Finanze, debiti, stress economico
- Dipendenze: sostanze, comportamentali

**APPROCCIO:**
- Diretto e non paternalistico
- Rispetta l'autonomia decisionale
- Esplora conseguenze senza giudicare
- Supporta scelte anche se non le condividi`;

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface OnboardingAnswers {
  ageRange?: string;
  primaryGoals?: string[];
  mainChallenge?: string;
  supportType?: string;
}

interface UserProfile {
  name: string | null;
  long_term_memory: string[];
  selected_goals: string[];
  gender: string | null;
  birth_date: string | null;
  height: number | null;
  therapy_status: string | null;
  occupation_context: string | null;
  onboarding_answers: OnboardingAnswers | null;
}

interface UserInterests {
  favorite_teams?: string[];
  sports_followed?: string[];
  music_genres?: string[];
  favorite_artists?: string[];
  current_shows?: string[];
  creative_hobbies?: string[];
  outdoor_activities?: string[];
  indoor_activities?: string[];
  pet_owner?: boolean;
  pets?: Array<{ type: string; name: string }>;
  personal_values?: string[];
  nickname?: string;
  relationship_status?: string;
  news_sensitivity?: string;
}

interface UserObjective {
  title: string;
  category: string;
  target_value: number | null;
  current_value: number | null;
  starting_value: number | null;
  unit: string | null;
}

interface DailyMetrics {
  vitals: { mood: number; anxiety: number; energy: number; sleep: number };
  emotions: Record<string, number | null>;
  life_areas: Record<string, number | null>;
  has_checkin: boolean;
  has_sessions: boolean;
}

interface RecentSession {
  start_time: string;
  ai_summary: string | null;
  mood_score_detected: number | null;
}

interface RealTimeContext {
  datetime?: {
    date: string;
    day: string;
    time: string;
    period: string;
    season: string;
    holiday?: string;
  };
  location?: {
    city: string;
    region: string;
    country: string;
  };
  weather?: {
    condition: string;
    temperature: number;
    feels_like: number;
    description: string;
  };
  news?: {
    headlines: string[];
    sports?: string[];
  };
}

interface VoiceContext {
  profile: UserProfile | null;
  interests: UserInterests | null;
  objectives: UserObjective[];
  dailyMetrics: DailyMetrics | null;
  recentSessions: RecentSession[];
  todayHabits: Array<{ habit_type: string; value: number; target_value: number | null }>;
  bodyMetrics: { weight: number | null; sleep_hours: number | null; steps: number | null } | null;
  realTimeContext: RealTimeContext | null;
  missingLifeAreas: string[];
  objectivesNeedingClarification: Array<{ title: string; category: string }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  return Math.floor((today.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

function formatTimeSince(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "oggi";
  if (diffDays === 1) return "ieri";
  if (diffDays < 7) return `${diffDays} giorni fa`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} settimane fa`;
  return `${Math.floor(diffDays / 30)} mesi fa`;
}

function getPersonaStyle(supportType?: string): string {
  if (supportType && PERSONA_STYLES[supportType]) {
    return PERSONA_STYLES[supportType];
  }
  return `**STILE: BILANCIATO**
- Tono caldo, professionale, empatico
- Alterna ascolto attivo e domande esplorative`;
}

function detectMissingLifeAreas(dailyMetrics: DailyMetrics | null): string[] {
  if (!dailyMetrics) return ['work', 'love', 'social', 'health', 'growth'];
  
  const areas = dailyMetrics.life_areas || {};
  const missing: string[] = [];
  
  const checkAreas = ['work', 'love', 'social', 'health', 'growth', 'family', 'finances', 'leisure'];
  for (const area of checkAreas) {
    if (areas[area] === null || areas[area] === undefined) {
      missing.push(area);
    }
  }
  
  return missing.slice(0, 3); // Max 3 to avoid overwhelming
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🏗️ BUILD CONTEXT BLOCKS
// ═══════════════════════════════════════════════════════════════════════════════

function buildUserContextBlock(ctx: VoiceContext): string {
  const blocks: string[] = [];
  
  // Basic user info
  if (ctx.profile) {
    const name = ctx.interests?.nickname || ctx.profile.name?.split(' ')[0] || null;
    let ageInfo = '';
    if (ctx.profile.birth_date) {
      const age = calculateAge(ctx.profile.birth_date);
      ageInfo = ` | Età: ${age} anni`;
    }
    
    let occupationInfo = '';
    if (ctx.profile.occupation_context === 'student') occupationInfo = ' | Studente';
    else if (ctx.profile.occupation_context === 'worker') occupationInfo = ' | Lavoratore';
    else if (ctx.profile.occupation_context === 'both') occupationInfo = ' | Studente-Lavoratore';
    
    blocks.push(`═══════════════════════════════════════════════
👤 CONTESTO UTENTE
═══════════════════════════════════════════════
Nome: ${name || 'Non specificato'}${ageInfo}${occupationInfo}
Terapia: ${ctx.profile.therapy_status === 'in_therapy' ? 'Segue già un percorso' : ctx.profile.therapy_status === 'seeking' ? 'Sta cercando supporto' : 'Non in terapia'}`);

    // Memory - ALL items for continuity
    if (ctx.profile.long_term_memory?.length > 0) {
      const recentMemory = ctx.profile.long_term_memory.slice(-30).join('\n- ');
      blocks.push(`
📝 MEMORIA (USA QUESTE INFO ATTIVAMENTE!):
- ${recentMemory}`);
    }
    
    // Goals from onboarding
    if (ctx.profile.selected_goals?.length > 0) {
      const goalLabels: Record<string, string> = {
        reduce_anxiety: 'Gestire ansia',
        improve_sleep: 'Dormire meglio',
        find_love: 'Migliorare relazioni',
        boost_energy: 'Aumentare energia',
        express_feelings: 'Esprimere emozioni'
      };
      const goals = ctx.profile.selected_goals.map(g => goalLabels[g] || g).join(', ');
      blocks.push(`🎯 Obiettivi dichiarati: ${goals}`);
    }
  }
  
  // Today's state
  if (ctx.dailyMetrics) {
    const v = ctx.dailyMetrics.vitals;
    if (v.mood > 0 || v.anxiety > 0 || v.energy > 0 || v.sleep > 0) {
      blocks.push(`
📊 STATO OGGI:
Umore: ${v.mood || '?'}/10 | Ansia: ${v.anxiety || '?'}/10 | Energia: ${v.energy || '?'}/10 | Sonno: ${v.sleep || '?'}/10`);
    }
    
    // Dominant emotions
    const emotions = Object.entries(ctx.dailyMetrics.emotions || {})
      .filter(([_, v]) => v && v > 3)
      .sort(([, a], [, b]) => (b || 0) - (a || 0))
      .slice(0, 3)
      .map(([k]) => k);
    if (emotions.length > 0) {
      blocks.push(`Emozioni prevalenti: ${emotions.join(', ')}`);
    }
  }
  
  // Active objectives with progress
  if (ctx.objectives?.length > 0) {
    const objList = ctx.objectives.map(o => {
      const progress = o.target_value && o.current_value !== null
        ? `${o.current_value}/${o.target_value} ${o.unit || ''}`
        : 'target non definito';
      return `• "${o.title}": ${progress}`;
    }).join('\n');
    blocks.push(`
🎯 OBIETTIVI ATTIVI:
${objList}`);
  }
  
  // Objectives needing clarification
  if (ctx.objectivesNeedingClarification?.length > 0) {
    const categoryLabels: Record<string, string> = {
      body: 'corpo', study: 'studio', work: 'lavoro',
      finance: 'finanze', relationships: 'relazioni',
      growth: 'crescita', mind: 'mente'
    };
    const objList = ctx.objectivesNeedingClarification.map(o => 
      `• "${o.title}" (${categoryLabels[o.category] || o.category})`
    ).join('\n');
    blocks.push(`
⚠️ OBIETTIVI CHE NECESSITANO TARGET (chiedi quando appropriato!):
${objList}`);
  }
  
  // Interests
  if (ctx.interests) {
    const interestParts: string[] = [];
    if (ctx.interests.favorite_teams?.length) 
      interestParts.push(`Squadre: ${ctx.interests.favorite_teams.join(', ')}`);
    if (ctx.interests.music_genres?.length || ctx.interests.favorite_artists?.length)
      interestParts.push(`Musica: ${[...(ctx.interests.music_genres || []), ...(ctx.interests.favorite_artists || [])].join(', ')}`);
    if (ctx.interests.current_shows?.length)
      interestParts.push(`Serie: ${ctx.interests.current_shows.join(', ')}`);
    if (ctx.interests.creative_hobbies?.length || ctx.interests.outdoor_activities?.length)
      interestParts.push(`Hobby: ${[...(ctx.interests.creative_hobbies || []), ...(ctx.interests.outdoor_activities || [])].join(', ')}`);
    if (ctx.interests.pet_owner && ctx.interests.pets?.length)
      interestParts.push(`Animali: ${ctx.interests.pets.map(p => `${p.name} (${p.type})`).join(', ')}`);
    
    if (interestParts.length > 0) {
      blocks.push(`
💫 INTERESSI (usa per personalizzare!):
${interestParts.join('\n')}`);
    }
  }
  
  // Recent sessions
  if (ctx.recentSessions?.length > 0) {
    const sessionsInfo = ctx.recentSessions.slice(0, 3).map((s) => {
      const timeAgo = formatTimeSince(s.start_time);
      return `• ${timeAgo}: ${s.ai_summary || 'conversazione breve'}`;
    }).join('\n');
    blocks.push(`
⏰ CONVERSAZIONI RECENTI (ricorda questi argomenti!):
${sessionsInfo}`);
  }
  
  // Habits today
  if (ctx.todayHabits?.length > 0) {
    const habitList = ctx.todayHabits.map(h => {
      const status = h.target_value ? `${h.value}/${h.target_value}` : `${h.value}`;
      return `${h.habit_type}: ${status}`;
    }).join(', ');
    blocks.push(`📋 Abitudini oggi: ${habitList}`);
  }
  
  // Body metrics
  if (ctx.bodyMetrics && (ctx.bodyMetrics.weight || ctx.bodyMetrics.sleep_hours || ctx.bodyMetrics.steps)) {
    const parts: string[] = [];
    if (ctx.bodyMetrics.weight) parts.push(`Peso: ${ctx.bodyMetrics.weight}kg`);
    if (ctx.bodyMetrics.sleep_hours) parts.push(`Sonno: ${ctx.bodyMetrics.sleep_hours}h`);
    if (ctx.bodyMetrics.steps) parts.push(`Passi: ${ctx.bodyMetrics.steps}`);
    if (parts.length > 0) {
      blocks.push(`📊 Corpo: ${parts.join(' | ')}`);
    }
  }
  
  return blocks.join('\n');
}

function buildRealTimeContextBlock(rtContext: RealTimeContext | null, userInterests: UserInterests | null): string {
  if (!rtContext) return '';
  
  let block = `
═══════════════════════════════════════════════
📍 CONTESTO TEMPO REALE
═══════════════════════════════════════════════`;

  if (rtContext.datetime) {
    block += `\nDATA/ORA: ${rtContext.datetime.day} ${rtContext.datetime.date}, ore ${rtContext.datetime.time} (${rtContext.datetime.period}, ${rtContext.datetime.season})`;
    if (rtContext.datetime.holiday) {
      block += `\n🎉 OGGI È: ${rtContext.datetime.holiday}`;
    }
  }

  if (rtContext.location?.city) {
    block += `\n\nPOSIZIONE: ${rtContext.location.city}${rtContext.location.region ? `, ${rtContext.location.region}` : ''}`;
  }

  if (rtContext.weather) {
    block += `\n\nMETEO: ${rtContext.weather.condition}, ${Math.round(rtContext.weather.temperature)}°C (percepiti ${Math.round(rtContext.weather.feels_like)}°C)
- ${rtContext.weather.description}`;
  }

  // News - check sensitivity
  const newsSensitivity = userInterests?.news_sensitivity || 'tutto';
  if (rtContext.news?.headlines && rtContext.news.headlines.length > 0 && newsSensitivity !== 'nessuna') {
    block += `\n\nULTIME NOTIZIE ITALIA:
${rtContext.news.headlines.slice(0, 3).map(n => `- ${n}`).join('\n')}`;
  }

  block += `

USO DEL CONTESTO:
- Usa questi dati solo se PERTINENTI
- NON forzare se l'utente ha un problema urgente
- Puoi contestualizzare: "Con questo tempo...", "È già ${rtContext.datetime?.period || 'tardi'}..."`;

  return block;
}

function buildDataHunterInstruction(missingAreas: string[]): string {
  if (missingAreas.length === 0) return '';
  
  const areaLabels: Record<string, string> = {
    love: 'Amore/Relazioni', work: 'Lavoro', social: 'Vita sociale', 
    health: 'Salute', growth: 'Crescita Personale', family: 'Famiglia',
    finances: 'Finanze', leisure: 'Tempo Libero', school: 'Studio'
  };
  const missingLabels = missingAreas.map(a => areaLabels[a] || a).join(', ');
  
  return `
═══════════════════════════════════════════════
🔍 DATA HUNTER (Missione Nascosta)
═══════════════════════════════════════════════
Non hai dati recenti su: ${missingLabels}
Inserisci NATURALMENTE una domanda su UNA di queste aree durante la conversazione.
Esempio: "A proposito, come va il lavoro ultimamente?"`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎙️ BUILD FULL SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════════════════════

function buildVoiceSystemPrompt(ctx: VoiceContext): string {
  const userContextBlock = buildUserContextBlock(ctx);
  const realTimeContextBlock = buildRealTimeContextBlock(ctx.realTimeContext, ctx.interests);
  const dataHunterBlock = buildDataHunterInstruction(ctx.missingLifeAreas);
  
  // Determine age protocol
  let ageProtocol = '';
  let calculatedAge: number | null = null;
  
  if (ctx.profile?.birth_date) {
    calculatedAge = calculateAge(ctx.profile.birth_date);
  }
  
  const ageRange = ctx.profile?.onboarding_answers?.ageRange;
  const isMinor = ageRange === '<18' || (calculatedAge !== null && calculatedAge < 18);
  const isYoungAdult = ageRange === '18-24' || (calculatedAge !== null && calculatedAge >= 18 && calculatedAge < 25);
  
  if (isMinor) {
    ageProtocol = YOUNG_USER_PROTOCOL;
  } else if (isYoungAdult) {
    ageProtocol = YOUNG_USER_PROTOCOL + '\n' + ADULT_USER_PROTOCOL;
  } else {
    ageProtocol = ADULT_USER_PROTOCOL;
  }
  
  // Persona style from onboarding
  const personaStyle = getPersonaStyle(ctx.profile?.onboarding_answers?.supportType);
  
  // Time context
  const now = new Date();
  const hour = now.getHours();
  let timeGreeting = '';
  if (hour >= 5 && hour < 12) timeGreeting = '🌅 È mattina - tono energico e positivo';
  else if (hour >= 12 && hour < 18) timeGreeting = '☀️ È pomeriggio - tono bilanciato';
  else if (hour >= 18 && hour < 22) timeGreeting = '🌆 È sera - tono più riflessivo e accogliente';
  else timeGreeting = '🌙 È notte - tono calmo e rassicurante';
  
  // First conversation check
  const isFirstConversation = !ctx.recentSessions || ctx.recentSessions.length === 0;
  let firstConversationBlock = '';
  
  if (isFirstConversation) {
    const name = ctx.profile?.name?.split(' ')[0] || '';
    firstConversationBlock = `
═══════════════════════════════════════════════
🌟 PRIMA CONVERSAZIONE VOCALE!
═══════════════════════════════════════════════
Questa è la prima volta che parli con ${name || 'questo utente'}!
- Presentati: "Ciao${name ? ' ' + name : ''}! Sono Aria, che bello sentirti!"
- Mostra curiosità: "Raccontami, come stai oggi?"
- Obiettivo: creare connessione, capire come si sente

⚠️ REGOLA CRITICA: NON dire addio o concludere la sessione 
fino a quando non hai raccolto almeno: mood, ansia, energia!`;
  }
  
  return `${ARIA_VOICE_CORE}

═══════════════════════════════════════════════
🎨 ${personaStyle}
═══════════════════════════════════════════════

${ageProtocol}

═══════════════════════════════════════════════
⏰ CONTESTO TEMPORALE: ${timeGreeting}
═══════════════════════════════════════════════

${firstConversationBlock}

${userContextBlock}

${realTimeContextBlock}

${dataHunterBlock}

═══════════════════════════════════════════════
📌 RICORDA: Risposte BREVI (2-4 frasi), tono NATURALE, usa il NOME!
═══════════════════════════════════════════════`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔐 USER CONTEXT FETCHING
// ═══════════════════════════════════════════════════════════════════════════════

async function getUserVoiceContext(authHeader: string | null): Promise<VoiceContext> {
  const defaultContext: VoiceContext = {
    profile: null,
    interests: null,
    objectives: [],
    dailyMetrics: null,
    recentSessions: [],
    todayHabits: [],
    bodyMetrics: null,
    realTimeContext: null,
    missingLifeAreas: [],
    objectivesNeedingClarification: []
  };
  
  if (!authHeader) {
    console.log('[aria-voice-chat] No auth header');
    return defaultContext;
  }
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('[aria-voice-chat] Missing Supabase config');
      return defaultContext;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.log('[aria-voice-chat] Auth failed:', userError?.message);
      return defaultContext;
    }
    
    console.log('[aria-voice-chat] User authenticated:', user.id);
    const today = new Date().toISOString().split('T')[0];
    
    // Parallel fetch all user data
    const [
      profileResult,
      interestsResult,
      objectivesResult,
      dailyMetricsResult,
      sessionsResult,
      habitsResult,
      bodyResult,
      realTimeContextResult
    ] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('name, long_term_memory, selected_goals, gender, birth_date, height, therapy_status, occupation_context, onboarding_answers, realtime_context_cache')
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('user_interests')
        .select('favorite_teams, sports_followed, music_genres, favorite_artists, current_shows, creative_hobbies, outdoor_activities, indoor_activities, pet_owner, pets, personal_values, nickname, relationship_status, news_sensitivity')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('user_objectives')
        .select('title, category, target_value, current_value, starting_value, unit')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(10),
      supabase.rpc('get_daily_metrics', { p_user_id: user.id, p_date: today }),
      supabase
        .from('sessions')
        .select('start_time, ai_summary, mood_score_detected')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('start_time', { ascending: false })
        .limit(5),
      supabase
        .from('daily_habits')
        .select('habit_type, value, target_value')
        .eq('user_id', user.id)
        .eq('date', today),
      supabase
        .from('body_metrics')
        .select('weight, sleep_hours, steps')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('global_context_cache')
        .select('data')
        .eq('cache_key', 'italy_news')
        .maybeSingle()
    ]);
    
    const profile = profileResult.data as any;
    const dailyMetrics = dailyMetricsResult.data as DailyMetrics | null;
    const objectives = (objectivesResult.data || []) as UserObjective[];
    
    // Build real-time context from cached data
    let realTimeContext: RealTimeContext | null = null;
    
    // Get datetime
    const now = new Date();
    const days = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const months = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 
                    'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
    const hours = now.getHours();
    let period = 'notte';
    if (hours >= 5 && hours < 12) period = 'mattina';
    else if (hours >= 12 && hours < 18) period = 'pomeriggio';
    else if (hours >= 18 && hours < 22) period = 'sera';
    
    const monthNum = now.getMonth();
    let season = 'inverno';
    if (monthNum >= 2 && monthNum <= 4) season = 'primavera';
    else if (monthNum >= 5 && monthNum <= 7) season = 'estate';
    else if (monthNum >= 8 && monthNum <= 10) season = 'autunno';
    
    realTimeContext = {
      datetime: {
        date: `${now.getDate()} ${months[monthNum]} ${now.getFullYear()}`,
        day: days[now.getDay()],
        time: `${hours}:${now.getMinutes().toString().padStart(2, '0')}`,
        period,
        season,
      }
    };
    
    // Add cached weather from profile
    if (profile?.realtime_context_cache) {
      const cached = profile.realtime_context_cache as RealTimeContext;
      if (cached.location) realTimeContext.location = cached.location;
      if (cached.weather) realTimeContext.weather = cached.weather;
    }
    
    // Add global news
    if (realTimeContextResult.data?.data) {
      const newsData = realTimeContextResult.data.data as any;
      if (newsData.headlines) {
        realTimeContext.news = { headlines: newsData.headlines };
      }
    }
    
    // Find missing life areas
    const missingLifeAreas = detectMissingLifeAreas(dailyMetrics);
    
    // Find objectives needing clarification
    const objectivesNeedingClarification = objectives
      .filter(o => o.target_value === null && ['body', 'finance', 'study'].includes(o.category))
      .map(o => ({ title: o.title, category: o.category }));
    
    return {
      profile: profile as UserProfile | null,
      interests: interestsResult.data as UserInterests | null,
      objectives,
      dailyMetrics,
      recentSessions: (sessionsResult.data || []) as RecentSession[],
      todayHabits: (habitsResult.data || []) as any[],
      bodyMetrics: bodyResult.data as any,
      realTimeContext,
      missingLifeAreas,
      objectivesNeedingClarification
    };
    
  } catch (err) {
    console.error('[aria-voice-chat] Context fetch error:', err);
    return defaultContext;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎙️ MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory } = await req.json();
    const authHeader = req.headers.get('Authorization');
    
    if (!message) {
      throw new Error('Message is required');
    }

    console.log('[aria-voice-chat] Processing:', message.substring(0, 50));

    // Get full user context
    const userContext = await getUserVoiceContext(authHeader);
    console.log('[aria-voice-chat] Context loaded for:', userContext.profile?.name || 'unknown');
    
    // Build personalized system prompt with ALL context
    const systemPrompt = buildVoiceSystemPrompt(userContext);

    // Build messages array
    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation history (last 10 exchanges)
    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const entry of conversationHistory.slice(-10)) {
        messages.push({
          role: entry.role === 'user' ? 'user' : 'assistant',
          content: entry.text || entry.content
        });
      }
    }

    // Add current message
    messages.push({ role: 'user', content: message });

    // Call Lovable AI Gateway
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages,
        max_tokens: 150, // Ultra-concise for fast voice responses
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[aria-voice-chat] Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded',
          text: 'Scusa, sono un po\' sovraccarica. Riprova tra qualche secondo.'
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'Payment required',
          text: 'Il servizio richiede crediti aggiuntivi.'
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const assistantText = data.choices?.[0]?.message?.content || 
      'Scusa, non ho capito. Puoi ripetere?';

    console.log('[aria-voice-chat] Response:', assistantText.substring(0, 80));

    // Generate audio with ElevenLabs (Italian-optimized voice)
    let audioBase64: string | null = null;
    const audioMimeType = 'audio/mpeg';
    
    if (ELEVENLABS_API_KEY) {
      try {
        console.log('[aria-voice-chat] Generating Italian voice audio...');
        
        const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ITALIAN_VOICE_ID}?output_format=mp3_44100_64&optimize_streaming_latency=4`, {
          method: 'POST',
          headers: {
            'xi-api-key': ELEVENLABS_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: assistantText,
            model_id: 'eleven_turbo_v2_5',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.8,
              use_speaker_boost: false
            }
          }),
        });

        if (ttsResponse.ok) {
          const audioBuffer = await ttsResponse.arrayBuffer();
          const uint8Array = new Uint8Array(audioBuffer);
          
          // Convert to base64
          let binary = '';
          for (let i = 0; i < uint8Array.length; i++) {
            binary += String.fromCharCode(uint8Array[i]);
          }
          audioBase64 = btoa(binary);
          
          console.log('[aria-voice-chat] Audio generated successfully');
        } else {
          console.error('[aria-voice-chat] ElevenLabs error:', ttsResponse.status);
        }
      } catch (ttsError) {
        console.error('[aria-voice-chat] TTS error:', ttsError);
      }
    }

    return new Response(JSON.stringify({ 
      text: assistantText,
      audio: audioBase64,
      mimeType: audioMimeType,
      success: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[aria-voice-chat] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      text: 'Si è verificato un errore. Riprova tra poco.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
