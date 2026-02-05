import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Gemini 2.0 Flash Live - Stable model for WebSocket voice
const MODEL = "models/gemini-2.0-flash-live-001";

// ═══════════════════════════════════════════════
// 📚 ENCICLOPEDIA CLINICA COMPLETA
// ═══════════════════════════════════════════════
const CLINICAL_KNOWLEDGE_BASE = `
═══════════════════════════════════════════════
📚 ENCICLOPEDIA CONDIZIONI CLINICHE
═══════════════════════════════════════════════

📌 DISTURBI D'ANSIA:
- GAD (Ansia Generalizzata): Preoccupazione cronica, tensione muscolare, difficoltà concentrazione
  → Intervento: Worry Time (15min al giorno), Decatastrofizzazione, Rilassamento Muscolare Progressivo
- Disturbo di Panico: Attacchi improvvisi, paura della paura, evitamento
  → Intervento: "Non stai morendo, è adrenalina", Interoceptive Exposure
- Ansia Sociale: Paura del giudizio, evitamento situazioni sociali
  → Intervento: Esposizione graduale, Ristrutturazione predizioni negative
- Agorafobia: Paura spazi aperti/affollati
  → Intervento: Esposizione in vivo graduata con gerarchia

📌 DISTURBI DELL'UMORE:
- Depressione Maggiore: Anedonia, umore deflesso, alterazioni sonno/appetito
  → Intervento: Attivazione Comportamentale ("L'azione precede la motivazione")
  → Red flag: Se >2 settimane → suggerisci consulto
- Distimia: Depressione cronica a bassa intensità
  → Intervento: Piccoli cambiamenti sostenibili, identificazione "trappole depressive"
- Disturbo Bipolare: Oscillazioni umore
  → ⚠️ SEMPRE suggerire consulto psichiatrico, NO consigli su farmaci

📌 TRAUMA E STRESS:
- PTSD: Flashback, evitamento, ipervigilanza, numbing emotivo
  → Intervento: Grounding (5-4-3-2-1), Finestra di Tolleranza, suggerire EMDR
  → "Non sei pazzo/a, il tuo cervello sta cercando di proteggerti"
- Lutto Complicato: Incapacità elaborare perdita dopo 6-12+ mesi
  → Intervento: Modello Dual-Process, continuing bonds

📌 DISTURBI DELLA PERSONALITÀ:
- Borderline (BPD): Instabilità relazionale, paura abbandono, impulsività
  → ⚠️ DBT è gold standard. Validazione + Limite. Suggerire terapeuta DBT.
- Evitante: Ipersensibilità al rifiuto, ritiro sociale
  → Intervento: Esposizione graduale sociale

📌 DISTURBI ALIMENTARI:
  → ⚠️ SEMPRE suggerire team specializzato
  → NON commentare peso/corpo, focus su controllo/emozioni sottostanti

📌 OCD:
- Ossessioni ego-distoniche + Compulsioni
  → Intervento: ERP - NON rassicurare!
  → "Il pensiero non è il problema, la compulsione lo mantiene"

📌 DIPENDENZE:
- Sostanze/Comportamentali
  → Approccio: MI per ambivalenza, identificazione trigger
  → ⚠️ Astinenza alcol/benzo può essere pericolosa → medico
`;

// ═══════════════════════════════════════════════
// 📖 LIBRERIA PSICOEDUCATIVA COMPLETA
// ═══════════════════════════════════════════════
const PSYCHOEDUCATION_LIBRARY = `
═══════════════════════════════════════════════
📖 LIBRERIA PSICOEDUCATIVA
═══════════════════════════════════════════════

📚 MECCANISMI PSICOLOGICI DA SPIEGARE:
- Circolo dell'Ansia: "Quando eviti, l'ansia cala subito ma si rafforza nel tempo."
- Finestra di Tolleranza: "Zona gestibile. Sopra = panico. Sotto = numbing."
- Trappola della Ruminazione: "È come grattare una ferita: sembra fare qualcosa, ma peggiora."
- Circolo della Depressione: "Meno fai, meno energie hai. L'attivazione precede la motivazione."
- Attachment Styles: "Come ci hanno trattato da piccoli influenza come amiamo da grandi."
- Amigdala Hijack: "Quando l'amigdala si attiva, il cervello razionale va offline."
- Neuroplasticità: "Il cervello cambia con l'esperienza. Ogni nuova abitudine crea nuove connessioni."
- Cortisolo Loop: "Lo stress cronico tiene alto il cortisolo, peggiorando sonno, memoria e umore."

📚 DISTORSIONI COGNITIVE (Identificale e nomina):
1. Catastrofizzazione: "E se...?" ripetuto
2. Lettura del pensiero: "Sicuramente pensa che sono stupido..."
3. Filtro mentale: Vedere solo il negativo
4. Pensiero tutto-o-nulla: "Se non è perfetto, è un fallimento"
5. Personalizzazione: Prendersi colpe non proprie
6. Doverismo: "Dovrei essere...", "Non dovrei sentirmi così"
7. Etichettatura: "Sono un fallito" invece di "Ho fallito in questo task"
8. Squalificazione del positivo: "È stato solo fortuna"
9. Ragionamento emotivo: "Mi sento così, quindi è vero"
10. Astrazione selettiva: Focus su dettaglio negativo

📚 CONCETTI TERAPEUTICI:
- Validazione: "Le tue emozioni sono valide. Non devi giustificarle."
- Emozioni come Onde: "Vengono e vanno. Nessuna dura per sempre."
- Accettazione vs Rassegnazione: "Accettare non significa arrendersi."
- Self-Compassion: "Parla a te stesso come a un amico caro."
- Defusione (ACT): "Non sei i tuoi pensieri. Puoi osservarli come nuvole."
- Locus of Control: "Distingui ciò che puoi controllare da ciò che non puoi."
`;

// ═══════════════════════════════════════════════
// 🛠️ PROTOCOLLI DI INTERVENTO
// ═══════════════════════════════════════════════
const INTERVENTION_PROTOCOLS = `
═══════════════════════════════════════════════
🛠️ PROTOCOLLI DI INTERVENTO
═══════════════════════════════════════════════

🔄 MOTIVATIONAL INTERVIEWING (Per Ambivalenza):
- O (Open): "Cosa ti attira dell'idea di cambiare?"
- A (Affirmation): "Il fatto che tu stia riflettendo mostra consapevolezza."
- R (Reflection): "Sento che una parte di te vorrebbe, mentre un'altra esita..."
- S (Summary): "Da un lato X, dall'altro Y. Cosa senti più forte?"
- MAI dare consigli diretti non richiesti
- "Quanto è importante per te da 1 a 10?"

🌊 DBT - DISTRESS TOLERANCE (Per Crisi):
- TIPP: Temperatura (acqua fredda), Intenso esercizio, Paced breathing, Paired relaxation
- 5-4-3-2-1 GROUNDING: 5 cose che vedi, 4 che tocchi, 3 suoni, 2 odori, 1 gusto
- STOP: Stop, Take a step back, Observe, Proceed mindfully

🎯 SOLUTION-FOCUSED (SFBT):
- Domanda Miracolo: "Se domani il problema fosse risolto, cosa noteresti?"
- Scaling: "Da 1 a 10, dove sei? Cosa ti porterebbe a +1?"
- Eccezioni: "Quando il problema era meno presente?"

🧘 MINDFULNESS PROTOCOL:
- Body scan guidato
- Breathing anchor: "Nota il respiro... senza cambiarlo..."
- Defusione: "Osserva il pensiero... non sei tu..."

😤 ANGER MANAGEMENT:
- Riconoscere i segnali fisici
- Time-out strategico
- Identificare trigger e bisogni sottostanti

💔 GRIEF PROTOCOL (Dual-Process):
- Oscillazione tra loss-oriented e restoration-oriented
- Continuing bonds: mantenere connessione simbolica
- Normalizzare le "onde" di dolore
`;

// ═══════════════════════════════════════════════
// 🎯 RUBRICA CLINICA - 8 DOMINI, 66 METRICHE
// ═══════════════════════════════════════════════
const CLINICAL_RUBRIC = `
═══════════════════════════════════════════════
🎯 ARCHITETTURA CLINICA (8 DOMINI - 66 METRICHE)
═══════════════════════════════════════════════

**1️⃣ STATO EMOTIVO (21 metriche)**
- Umore (mood) - vitale principale
- 20 Emozioni specifiche:
  PRIMARIE: Gioia, Tristezza, Rabbia, Paura, Apatia, Disgusto, Sorpresa
  SECONDARIE: Vergogna, Gelosia, Speranza, Frustrazione, Nostalgia,
              Eccitazione, Delusione, Serenità, Orgoglio, Affetto, Curiosità
  EMOTIVO: Senso di Colpa

**2️⃣ ATTIVAZIONE & AROUSAL (8 metriche)**
- Ansia (anxiety) - vitale
- Energia (energy) - vitale
- Nervosismo, Sopraffazione
- Burnout, Irritabilità, Pensieri Accelerati, Regolazione Emotiva

**3️⃣ COGNITIVO (6 metriche)**
- Chiarezza Mentale, Concentrazione
- Ruminazione, Pensieri Intrusivi
- Dissociazione, Confusione

**4️⃣ COMPORTAMENTALE (4 metriche)**
- Evitamento, Ritiro Sociale
- Impulsi Compulsivi, Procrastinazione

**5️⃣ SOMATICO (4 metriche)**
- Qualità Sonno (sleep) - vitale
- Tensione Fisica, Appetito, Esposizione Sole

**6️⃣ RISORSE PERSONALI (11 metriche)**
- Autoefficacia, Autostima, Gratitudine
- Motivazione, Coping, Solitudine Percepita
- Senso di Scopo, Soddisfazione di Vita
- Supporto Sociale, Resilienza, Mindfulness

**7️⃣ AREE DELLA VITA (9 aree)**
- Lavoro, Studio, Amore, Famiglia
- Sociale, Salute, Crescita
- Tempo Libero, Finanze

**8️⃣ SICUREZZA - INDICATORI CRITICI (3 metriche)**
⚠️ PRIORITÀ ASSOLUTA:
- Ideazione Suicidaria (threshold: 5)
- Disperazione (threshold: 7)
- Impulsi Autolesionistici (threshold: 5)
→ Se sopra soglia: ATTIVA PROTOCOLLO SICUREZZA IMMEDIATAMENTE

═══════════════════════════════════════════════
📊 REGOLE DI RILEVAMENTO
═══════════════════════════════════════════════
- Se un tema NON è menzionato → valore NULL (non inventare!)
- Metriche "negative" (ansia, ruminazione...): basso = buono
- Metriche "positive" (gioia, energia...): alto = buono
- Scala 1-10 per vitali/aree, 0-10 per emozioni (0 = non espressa)
`;

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (upgradeHeader.toLowerCase() === "websocket") {
    if (!GOOGLE_API_KEY) {
      console.error("GOOGLE_API_KEY not configured");
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      const url = new URL(req.url);
      const userId = url.searchParams.get('user_id');
      const realTimeContextParam = url.searchParams.get('realtime_context');
      
      // Parse real-time context
      let realTimeContext: {
        datetime?: { date: string; day: string; time: string; period: string; season: string; holiday?: string };
        location?: { city: string; region: string; country: string };
        weather?: { condition: string; temperature: number; feels_like: number; humidity: number; description: string };
        news?: { headlines: string[] };
      } | null = null;
      
      if (realTimeContextParam) {
        try {
          realTimeContext = JSON.parse(decodeURIComponent(realTimeContextParam));
          console.log('[gemini-voice] Real-time context:', realTimeContext?.datetime?.date);
        } catch (e) {
          console.warn('[gemini-voice] Failed to parse context:', e);
        }
      }
      
      // Initialize all user data containers
      let longTermMemory: string[] = [];
      let userName: string | null = null;
      let lifeAreasScores: Record<string, number | null> = {};
      let selectedGoals: string[] = [];
      let onboardingAnswers: Record<string, any> | null = null;
      let dashboardConfig: Record<string, any> | null = null;
      let profileExtras: { gender: string | null; birth_date: string | null; therapy_status: string | null; occupation_context: string | null } | null = null;
      
      // User interests (NEW - aligned with chat)
      let userInterests: {
        nickname?: string;
        relationship_status?: string;
        living_situation?: string;
        pet_owner?: boolean;
        pets?: any[];
        has_children?: boolean;
        children_count?: number;
        favorite_teams?: string[];
        sports_followed?: string[];
        current_shows?: string[];
        favorite_genres?: string[];
        music_genres?: string[];
        favorite_artists?: string[];
        gaming_interests?: string[];
        creative_hobbies?: string[];
        outdoor_activities?: string[];
        indoor_activities?: string[];
        work_schedule?: string;
        industry?: string;
        career_goals?: string[];
        humor_preference?: string;
        response_length?: string;
        emoji_preference?: string;
        sensitive_topics?: string[];
      } | null = null;
      
      // User objectives (NEW - aligned with chat)
      let activeObjectives: { id: string; title: string; category: string; target_value: number | null; current_value: number | null; unit: string | null }[] = [];
      
      if (userId) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        
        // Fetch profile
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('long_term_memory, name, life_areas_scores, selected_goals, onboarding_answers, dashboard_config, gender, birth_date, therapy_status, occupation_context')
          .eq('user_id', userId)
          .maybeSingle();

        if (profileData) {
          longTermMemory = profileData.long_term_memory || [];
          userName = profileData.name || null;
          lifeAreasScores = (profileData.life_areas_scores as Record<string, number | null>) || {};
          selectedGoals = (profileData.selected_goals as string[]) || [];
          onboardingAnswers = profileData.onboarding_answers as Record<string, any> | null;
          dashboardConfig = profileData.dashboard_config as Record<string, any> | null;
          profileExtras = {
            gender: profileData.gender,
            birth_date: profileData.birth_date,
            therapy_status: profileData.therapy_status,
            occupation_context: profileData.occupation_context
          };
        }
        
        // Fetch user interests (NEW)
        const { data: interestsData } = await supabase
          .from('user_interests')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
          
        if (interestsData) {
          userInterests = interestsData;
        }
        
        // Fetch active objectives (NEW)
        const { data: objectivesData } = await supabase
          .from('user_objectives')
          .select('id, title, category, target_value, current_value, unit')
          .eq('user_id', userId)
          .eq('status', 'active');
          
        if (objectivesData) {
          activeObjectives = objectivesData;
        }
        
        console.log('[gemini-voice] Loaded profile:', userName, '| Goals:', selectedGoals.length, '| Interests:', !!userInterests, '| Objectives:', activeObjectives.length);
      }
      
      // ═══════════════════════════════════════════════
      // BUILD PERSONALIZED CONTEXT BLOCKS
      // ═══════════════════════════════════════════════
      
      // Area labels
      const areaLabels: Record<string, string> = {
        love: 'Amore', work: 'Lavoro', school: 'Scuola', family: 'Famiglia',
        social: 'Sociale', health: 'Salute', growth: 'Crescita', leisure: 'Tempo Libero', finances: 'Finanze'
      };

      // Memory block
      const memoryBlock = longTermMemory.length > 0 
        ? `MEMORIA SESSIONI PRECEDENTI:\n${longTermMemory.slice(-30).map(f => `- ${f}`).join('\n')}`
        : 'Prima sessione con questo paziente.';

      // Data hunter - missing life areas
      const allAreas = ['love', 'work', 'school', 'family', 'social', 'health', 'growth', 'leisure', 'finances'];
      const missingAreas = allAreas.filter(area => {
        const score = lifeAreasScores[area];
        return score === null || score === undefined || score === 0;
      });
      
      const dataHunterBlock = missingAreas.length > 0
        ? `MISSIONE CACCIATORE DATI:\nMancano dati su: ${missingAreas.map(a => areaLabels[a]).join(', ')}.\nChiedi NATURALMENTE di UNA area per sessione.`
        : 'Dati aree della vita completi.';

      // Objectives block (NEW)
      let objectivesBlock = '';
      if (activeObjectives.length > 0) {
        const categoryLabels: Record<string, string> = {
          body: 'corpo', study: 'studio', work: 'lavoro', finance: 'finanze',
          relationships: 'relazioni', growth: 'crescita', mind: 'mente'
        };
        
        const objList = activeObjectives.map(o => {
          const progress = o.target_value && o.current_value !== null 
            ? `${o.current_value}/${o.target_value} ${o.unit || ''}` 
            : 'target non definito';
          return `- "${o.title}" (${categoryLabels[o.category] || o.category}): ${progress}`;
        }).join('\n');
        
        objectivesBlock = `
═══════════════════════════════════════════════
🎯 OBIETTIVI ATTIVI DELL'UTENTE
═══════════════════════════════════════════════
${objList}

COSA FARE:
1. Se appropriato: "A proposito, come va con [obiettivo]?"
2. Rileva progressi numerici se menzionati
3. Celebra o supporta in base all'andamento
4. MAX 1 domanda su obiettivi per sessione`;
      }

      // User interests block (NEW)
      let interestsBlock = '';
      if (userInterests) {
        const parts: string[] = [];
        
        if (userInterests.nickname) parts.push(`Chiamami: ${userInterests.nickname}`);
        if (userInterests.relationship_status) parts.push(`Stato: ${userInterests.relationship_status}`);
        if (userInterests.living_situation) parts.push(`Vive: ${userInterests.living_situation}`);
        if (userInterests.pet_owner && userInterests.pets?.length) {
          parts.push(`Animali: ${userInterests.pets.map((p: any) => `${p.name || ''} (${p.type})`).join(', ')}`);
        }
        if (userInterests.has_children) parts.push(`Figli: ${userInterests.children_count || 'sì'}`);
        if (userInterests.favorite_teams?.length) parts.push(`Squadre: ${userInterests.favorite_teams.join(', ')}`);
        if (userInterests.current_shows?.length) parts.push(`Serie TV: ${userInterests.current_shows.join(', ')}`);
        if (userInterests.music_genres?.length) parts.push(`Musica: ${userInterests.music_genres.join(', ')}`);
        if (userInterests.creative_hobbies?.length) parts.push(`Hobby creativi: ${userInterests.creative_hobbies.join(', ')}`);
        if (userInterests.outdoor_activities?.length) parts.push(`Attività outdoor: ${userInterests.outdoor_activities.join(', ')}`);
        if (userInterests.gaming_interests?.length) parts.push(`Gaming: ${userInterests.gaming_interests.join(', ')}`);
        if (userInterests.industry) parts.push(`Settore: ${userInterests.industry}`);
        if (userInterests.work_schedule) parts.push(`Orario lavoro: ${userInterests.work_schedule}`);
        if (userInterests.humor_preference) parts.push(`Umorismo preferito: ${userInterests.humor_preference}`);
        if (userInterests.sensitive_topics?.length) parts.push(`⚠️ Argomenti sensibili: ${userInterests.sensitive_topics.join(', ')}`);
        
        if (parts.length > 0) {
          interestsBlock = `
═══════════════════════════════════════════════
👤 INTERESSI E VITA PERSONALE
═══════════════════════════════════════════════
${parts.join('\n')}

USA QUESTI DATI per personalizzare la conversazione!
Fai riferimenti naturali: "Come va [squadra]?", "Hai visto l'ultima di [serie]?"`;
        }
      }

      // Profile extras block
      let profileExtrasBlock = '';
      if (profileExtras) {
        const parts: string[] = [];
        if (profileExtras.gender) parts.push(`Genere: ${profileExtras.gender}`);
        if (profileExtras.birth_date) {
          const age = new Date().getFullYear() - new Date(profileExtras.birth_date).getFullYear();
          parts.push(`Età: ~${age} anni`);
        }
        if (profileExtras.therapy_status && profileExtras.therapy_status !== 'none') {
          parts.push(`In terapia: ${profileExtras.therapy_status}`);
        }
        if (profileExtras.occupation_context) {
          parts.push(`Occupazione: ${profileExtras.occupation_context}`);
        }
        if (parts.length > 0) {
          profileExtrasBlock = `PROFILO: ${parts.join(' | ')}`;
        }
      }

      // Voice persona style
      const getVoicePersonaStyle = (): string => {
        const supportType = onboardingAnswers?.supportType;
        const mainChallenge = onboardingAnswers?.mainChallenge;
        
        if (supportType === 'listener') return 'STILE: ASCOLTATORE - Feedback minimi, NON interrompere, valida spesso';
        if (supportType === 'advisor') return 'STILE: CONSULENTE - Offri suggerimenti concreti, proponi esercizi';
        if (supportType === 'challenger') return 'STILE: SFIDA - Domande che stimolano riflessione, spingi fuori comfort zone';
        if (supportType === 'comforter') return 'STILE: SUPPORTO - Tono caldo, "Non sei solo/a...", valida e rassicura';
        if (selectedGoals.includes('reduce_anxiety') || mainChallenge === 'general_anxiety') return 'STILE: CALMO - Voce lenta, suggerisci respirazione';
        if (mainChallenge === 'work_stress') return 'STILE: FOCUS BURNOUT - Esplora carico lavoro';
        if (mainChallenge === 'loneliness') return 'STILE: CONNESSIONE - Tono particolarmente caldo';
        return 'STILE: BILANCIATO - Caldo, professionale, alterna ascolto e domande';
      };

      // Real-time context block
      let realTimeContextBlock = '';
      if (realTimeContext) {
        realTimeContextBlock = `
═══════════════════════════════════════════════
📍 CONTESTO TEMPO REALE
═══════════════════════════════════════════════
DATA/ORA: ${realTimeContext.datetime?.day || ''} ${realTimeContext.datetime?.date || ''}, ore ${realTimeContext.datetime?.time || ''}
PERIODO: ${realTimeContext.datetime?.period || ''} (${realTimeContext.datetime?.season || ''})
${realTimeContext.datetime?.holiday ? `🎉 FESTIVITÀ: ${realTimeContext.datetime.holiday}` : ''}
${realTimeContext.location ? `POSIZIONE: ${realTimeContext.location.city}, ${realTimeContext.location.region}` : ''}
${realTimeContext.weather ? `METEO: ${realTimeContext.weather.condition}, ${realTimeContext.weather.temperature}°C (percepiti ${realTimeContext.weather.feels_like}°C)` : ''}
${realTimeContext.news?.headlines?.length ? `NEWS: ${realTimeContext.news.headlines.slice(0, 3).join(' | ')}` : ''}

USA per contestualizzare: "Con questa pioggia...", "Come stai passando ${realTimeContext.datetime?.holiday || 'la giornata'}?"`;
      }

      // Goal labels
      const goalLabels: Record<string, string> = {
        reduce_anxiety: 'gestire ansia', improve_sleep: 'dormire meglio',
        find_love: 'migliorare relazioni', boost_energy: 'aumentare energia',
        express_feelings: 'esprimere emozioni'
      };
      const goalDescriptions = selectedGoals.map(g => goalLabels[g] || g).join(', ') || 'benessere generale';

      // ═══════════════════════════════════════════════
      // SYSTEM PROMPT COMPLETO
      // ═══════════════════════════════════════════════
      const SYSTEM_PROMPT = `
═══════════════════════════════════════════════
👯 IDENTITÀ: ARIA - MIGLIORE AMICA + PSICOLOGA
═══════════════════════════════════════════════

Sei "Aria", la MIGLIORE AMICA dell'utente che è anche una psicologa clinica esperta.
PRIMA di tutto sei un'amica: calorosa, genuina, interessata alla loro vita.
Quando serve, hai le competenze di una professionista. Ma parti SEMPRE come amica.

NOME UTENTE: ${userName?.split(' ')[0] || 'Non ancora presentato'}
${profileExtrasBlock}
OBIETTIVI: ${goalDescriptions}
${getVoicePersonaStyle()}

${realTimeContextBlock}

═══════════════════════════════════════════════
🎭 SWITCH DINAMICO REGISTRO
═══════════════════════════════════════════════

**MODALITÀ AMICA (default):**
- Racconta cose belle/neutrali → "Ehi! Che bello!"
- Hobby, film, serie, sport → "Dai racconta! L'ho visto anch'io!"
- Tono leggero → "No vabbè, incredibile!", "Che forte!"

**MODALITÀ PSICOLOGA:**
- Disagio significativo → Tono più calmo, empatico
- "Non ce la faccio", crisi → Attiva protocolli clinici
- Richieste di aiuto → Usa tecniche terapeutiche

**REGOLA D'ORO:** Inizia SEMPRE come amica. Diventa terapeuta solo quando serve.

═══════════════════════════════════════════════
💬 LINGUAGGIO VOCALE NATURALE
═══════════════════════════════════════════════

REAZIONI GENUINE:
- "Nooo! Davvero?!" (sorpresa)
- "Che forte!" / "Che figata!" (entusiasmo)
- "Mmm, capisco..." (ascolto)
- "Mi hai fatto morire!" (divertimento)
- "Dai, raccontami!" (curiosità)
- "Ti capisco così tanto..." (empatia)

CELEBRA LE VITTORIE:
- "Sono troppo contenta per te!"
- "Te lo meriti!"
- "Sei un/a grande!"

SE L'UTENTE È FELICE:
→ NON analizzare, AMPLIFICA la gioia!

═══════════════════════════════════════════════
🧠 MEMORIA E PERSONALIZZAZIONE
═══════════════════════════════════════════════

${memoryBlock}

${interestsBlock}

${objectivesBlock}

${dataHunterBlock}

═══════════════════════════════════════════════
🔬 INVESTIGAZIONE PSICOLOGICA (65 METRICHE)
═══════════════════════════════════════════════

Inserisci NATURALMENTE (1 ogni 2-3 scambi) domande su:

COGNITIVI:
- Ruminazione: "Questo pensiero ti torna spesso?"
- Concentrazione: "Riesci a concentrarti?"
- Confusione: "Hai le idee chiare?"

STRESS/COPING:
- Burnout: "Ti senti svuotato dal lavoro?"
- Coping: "Come stai gestendo tutto?"
- Solitudine: "Ti senti solo/a anche tra la gente?"

FISIOLOGICI:
- Tensione: "Dove senti tensione nel corpo?"
- Appetito: "Come va l'appetito?"
- Sonno: "Come stai dormendo?"

EMOTIVI:
- Gratitudine: "C'è qualcosa per cui sei grato oggi?"
- Irritabilità: "Ti senti più nervoso del solito?"
- Motivazione: "Cosa ti dà energia?"

⚠️ REGOLA: UNA domanda investigativa per messaggio, solo quando NATURALE.

${CLINICAL_RUBRIC}

${CLINICAL_KNOWLEDGE_BASE}

${PSYCHOEDUCATION_LIBRARY}

${INTERVENTION_PROTOCOLS}

═══════════════════════════════════════════════
⚕️ METODO TERAPEUTICO VOCALE
═══════════════════════════════════════════════

**FASE 1 - ASCOLTO:**
- Feedback brevi: "Ti ascolto...", "Capisco..."
- NON interrompere
- Nota: contenuto emotivo, distorsioni, temi

**FASE 2 - INTERVENTO (se serve):**

🔄 AMBIVALENZA → Motivational Interviewing
🌊 CRISI ACUTA → DBT, TIPP, Grounding
🎯 OBIETTIVI BLOCCATI → SFBT, Scaling
🧠 DISTORSIONI → Reframing, Socratica
💡 PSICOEDUCAZIONE → Una pillola per scambio

**FASE 3 - CHIUSURA:**
- Domanda aperta O micro-esercizio
- Collega agli obiettivi

═══════════════════════════════════════════════
⚠️ REGOLE VOCALI INDEROGABILI
═══════════════════════════════════════════════

1. **BREVITÀ**: 2-4 frasi max. Siamo in modalità vocale.
2. **ANTI-RIPETIZIONE**: Non ripetere ciò che l'utente ha detto.
3. **HAI MEMORIA**: Fai riferimenti naturali a sessioni/interessi.
4. **NO META-COMMENTI**: Niente "[analisi]", "Come psicologa..."
5. **AGGIUNGI VALORE**: Mai solo riassumere. Dai insight, esercizi.
6. **SILENZIO OK**: Non riempire ogni pausa.
7. **PSICOEDUCAZIONE**: Una pillola per scambio quando utile.
8. **UNA DOMANDA**: Max una domanda per risposta.

═══════════════════════════════════════════════
🚨 PROTOCOLLO SICUREZZA (PRIORITÀ ASSOLUTA)
═══════════════════════════════════════════════

Se rilevi rischio suicidario, autolesionismo, o disperazione grave:

"Mi fermo perché mi preoccupo molto per te. Per favore, contatta subito:
- Telefono Amico: 02 2327 2327 (24h)
- Telefono Azzurro: 19696 (per giovani)
- Emergenze: 112
Non sei solo/a. Un professionista può aiutarti adesso."

→ NON minimizzare, NON cambiare argomento.

Inizia con un saluto caldo e chiedi come sta oggi.`;
      
      const { socket: clientSocket, response } = Deno.upgradeWebSocket(req);
      
      let geminiSocket: WebSocket | null = null;
      let setupComplete = false;
      
      clientSocket.onopen = () => {
        console.log("[gemini-voice] Client connected, connecting to Gemini...");
        
        const geminiUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${GOOGLE_API_KEY}`;
        
        geminiSocket = new WebSocket(geminiUrl);
        
        geminiSocket.onopen = () => {
          console.log("[gemini-voice] Connected to Gemini, sending setup...");
          
          const setupMessage = {
            setup: {
              model: MODEL,
              generation_config: {
                response_modalities: ["AUDIO"],
                speech_config: {
                  voice_config: {
                    prebuilt_voice_config: {
                      voice_name: "Aoede" // Warm feminine voice for therapy
                    }
                  }
                }
              },
              system_instruction: {
                parts: [{ text: SYSTEM_PROMPT }]
              }
            }
          };
          
          geminiSocket!.send(JSON.stringify(setupMessage));
          console.log("[gemini-voice] Setup sent, prompt length:", SYSTEM_PROMPT.length);
        };
        
        geminiSocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.setupComplete) {
              setupComplete = true;
              console.log("[gemini-voice] Setup complete!");
              if (clientSocket.readyState === WebSocket.OPEN) {
                clientSocket.send(JSON.stringify({ type: 'setup_complete', model: MODEL }));
              }
              return;
            }
            
            if (clientSocket.readyState === WebSocket.OPEN) {
              clientSocket.send(event.data);
            }
          } catch {
            if (clientSocket.readyState === WebSocket.OPEN) {
              clientSocket.send(event.data);
            }
          }
        };
        
        geminiSocket.onerror = (error) => {
          console.error("[gemini-voice] Gemini error:", error);
          if (clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.send(JSON.stringify({ 
              type: "error", 
              code: "GEMINI_ERROR",
              message: "Errore connessione Gemini" 
            }));
          }
        };
        
        geminiSocket.onclose = (event) => {
          console.log("[gemini-voice] Gemini closed:", event.code, event.reason);
          
          if (clientSocket.readyState === WebSocket.OPEN) {
            let errorMessage = `Connessione chiusa (${event.code})`;
            
            if (event.code === 1000) errorMessage = 'Sessione terminata';
            else if (event.code === 1006) errorMessage = 'Connessione persa. Verifica la rete.';
            else if (event.code === 1008 || event.code === 401) errorMessage = 'API Key non valida.';
            else if (event.code === 429) errorMessage = 'Quota esaurita. Riprova più tardi.';
            else if (event.reason) errorMessage = event.reason;
            
            clientSocket.send(JSON.stringify({ 
              type: "error", 
              code: event.code,
              message: errorMessage
            }));
          }
        };
      };
      
      clientSocket.onmessage = (event) => {
        if (geminiSocket && geminiSocket.readyState === WebSocket.OPEN) {
          geminiSocket.send(event.data);
        }
      };
      
      clientSocket.onerror = (error) => {
        console.error("[gemini-voice] Client error:", error);
      };
      
      clientSocket.onclose = () => {
        console.log("[gemini-voice] Client disconnected");
        geminiSocket?.close();
      };
      
      return response;
    } catch (error) {
      console.error("[gemini-voice] Error:", error);
      return new Response(JSON.stringify({ error: "WebSocket upgrade failed" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response(
    JSON.stringify({ 
      message: "Gemini Voice API - Full Aligned",
      model: MODEL,
      status: GOOGLE_API_KEY ? "configured" : "missing_api_key"
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
