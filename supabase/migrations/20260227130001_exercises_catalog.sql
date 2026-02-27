-- =============================================
-- ARIA V2.0 - Exercises Catalog
-- =============================================

-- Tabella catalogo esercizi
CREATE TABLE IF NOT EXISTS public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  category TEXT,
  title TEXT,
  description TEXT,
  clinical_basis TEXT,
  duration_minutes INTEGER,
  steps JSONB,
  animation_type TEXT,
  animation_config JSONB,
  target_symptoms TEXT[],
  difficulty TEXT DEFAULT 'beginner',
  is_active BOOLEAN DEFAULT true,
  points_reward INTEGER DEFAULT 8,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- SELECT pubblico per utenti autenticati
CREATE POLICY "Authenticated users can view exercises"
  ON public.exercises FOR SELECT
  USING (auth.role() = 'authenticated');

-- INSERT/UPDATE/DELETE solo service_role (nessuna policy per utenti normali)
-- Il service_role bypassa RLS di default

-- Grant
GRANT SELECT ON public.exercises TO authenticated;

-- =============================================
-- Popola con 12 esercizi iniziali
-- =============================================
INSERT INTO public.exercises (slug, category, title, description, clinical_basis, duration_minutes, steps, animation_type, animation_config, target_symptoms, difficulty, points_reward) VALUES

-- 1. Respirazione 4-7-8
('breathing-478', 'breathing', 'Respirazione 4-7-8',
 'Tecnica di respirazione calmante del Dr. Andrew Weil. Inspira per 4 secondi, trattieni per 7, espira per 8.',
 'Attiva il sistema nervoso parasimpatico, riduce cortisolo e frequenza cardiaca. Efficace per ansia e insonnia.',
 5,
 '[{"step": 1, "instruction": "Siediti comodamente e chiudi gli occhi", "duration": 5},
   {"step": 2, "instruction": "Inspira dal naso contando fino a 4", "duration": 4},
   {"step": 3, "instruction": "Trattieni il respiro contando fino a 7", "duration": 7},
   {"step": 4, "instruction": "Espira dalla bocca contando fino a 8", "duration": 8},
   {"step": 5, "instruction": "Ripeti il ciclo per 4 volte", "duration": 76}]'::jsonb,
 'breathing_circle', '{"color": "#4FC3F7", "phases": [4, 7, 8], "cycles": 4}'::jsonb,
 ARRAY['ansia', 'insonnia', 'stress', 'panico'],
 'beginner', 8),

-- 2. Body Scan
('body-scan', 'mindfulness', 'Body Scan Progressivo',
 'Scansione corporea guidata dalla testa ai piedi. Porta consapevolezza ad ogni parte del corpo.',
 'Riduce tensione muscolare e dissociazione. Migliora la propriocezione e il collegamento mente-corpo (Kabat-Zinn, 1990).',
 10,
 '[{"step": 1, "instruction": "Sdraiati o siediti comodamente", "duration": 10},
   {"step": 2, "instruction": "Porta attenzione alla sommità della testa", "duration": 30},
   {"step": 3, "instruction": "Scendi al viso: fronte, occhi, mascella", "duration": 60},
   {"step": 4, "instruction": "Collo e spalle: nota ogni tensione", "duration": 60},
   {"step": 5, "instruction": "Braccia, mani, dita", "duration": 60},
   {"step": 6, "instruction": "Torace e addome: osserva il respiro", "duration": 90},
   {"step": 7, "instruction": "Schiena e bacino", "duration": 60},
   {"step": 8, "instruction": "Gambe, piedi, dita dei piedi", "duration": 60},
   {"step": 9, "instruction": "Senti tutto il corpo come un insieme", "duration": 30}]'::jsonb,
 'body_highlight', '{"color": "#81C784", "speed": "slow"}'::jsonb,
 ARRAY['tensione', 'dissociazione', 'stress', 'somatizzazione'],
 'beginner', 10),

-- 3. Grounding 5-4-3-2-1
('grounding-54321', 'grounding', 'Grounding 5-4-3-2-1',
 'Tecnica di radicamento sensoriale: identifica 5 cose che vedi, 4 che tocchi, 3 che senti, 2 che annusi, 1 che gusti.',
 'Interrompe cicli di dissociazione e panico ancorando al presente attraverso i 5 sensi (Najavits, 2002).',
 5,
 '[{"step": 1, "instruction": "Nomina 5 cose che puoi VEDERE intorno a te", "duration": 60},
   {"step": 2, "instruction": "Tocca 4 superfici diverse e descrivi la sensazione", "duration": 60},
   {"step": 3, "instruction": "Ascolta 3 suoni diversi nell''ambiente", "duration": 45},
   {"step": 4, "instruction": "Identifica 2 odori intorno a te", "duration": 30},
   {"step": 5, "instruction": "Nota 1 sapore nella tua bocca", "duration": 15}]'::jsonb,
 'senses_counter', '{"color": "#FFB74D", "senses": ["vista", "tatto", "udito", "olfatto", "gusto"]}'::jsonb,
 ARRAY['panico', 'dissociazione', 'ansia', 'flashback'],
 'beginner', 8),

-- 4. Journaling Emotivo
('emotional-journaling', 'journaling', 'Journaling Emotivo Guidato',
 'Scrittura espressiva guidata per elaborare emozioni difficili. Segui i prompt per esplorare i tuoi sentimenti.',
 'La scrittura espressiva riduce stress e migliora il benessere psicologico (Pennebaker, 1997). Efficace per elaborazione traumatica.',
 15,
 '[{"step": 1, "instruction": "Cosa stai provando in questo momento? Scrivi liberamente per 3 minuti", "duration": 180},
   {"step": 2, "instruction": "Dove senti questa emozione nel corpo?", "duration": 60},
   {"step": 3, "instruction": "Quando hai iniziato a sentirla? Cosa è successo?", "duration": 180},
   {"step": 4, "instruction": "Cosa vorresti dire a te stesso in questo momento?", "duration": 120},
   {"step": 5, "instruction": "Rileggi quello che hai scritto. Come ti senti ora?", "duration": 60}]'::jsonb,
 'typewriter', '{"color": "#CE93D8", "prompts": true}'::jsonb,
 ARRAY['ruminazione', 'elaborazione', 'tristezza', 'rabbia'],
 'beginner', 12),

-- 5. Rilassamento Muscolare Progressivo
('pmr', 'relaxation', 'Rilassamento Muscolare Progressivo',
 'Tecnica di Jacobson: contrai e rilascia progressivamente ogni gruppo muscolare per ridurre la tensione.',
 'Riduce tensione muscolare cronica, ansia somatica e insonnia. Ampiamente validato in letteratura (Jacobson, 1938).',
 12,
 '[{"step": 1, "instruction": "Stringi forte i pugni per 5 secondi... poi rilascia", "duration": 15},
   {"step": 2, "instruction": "Contrai i bicipiti per 5 secondi... poi rilascia", "duration": 15},
   {"step": 3, "instruction": "Alza le spalle alle orecchie per 5 secondi... poi rilascia", "duration": 15},
   {"step": 4, "instruction": "Contrai i muscoli del viso per 5 secondi... poi rilascia", "duration": 15},
   {"step": 5, "instruction": "Contrai addome e glutei per 5 secondi... poi rilascia", "duration": 15},
   {"step": 6, "instruction": "Contrai cosce e polpacci per 5 secondi... poi rilascia", "duration": 15},
   {"step": 7, "instruction": "Stringi le dita dei piedi per 5 secondi... poi rilascia", "duration": 15},
   {"step": 8, "instruction": "Rilassa tutto il corpo. Nota la differenza", "duration": 30}]'::jsonb,
 'muscle_highlight', '{"color": "#EF9A9A", "tension_color": "#F44336", "release_color": "#4CAF50"}'::jsonb,
 ARRAY['tensione', 'ansia', 'insonnia', 'stress'],
 'beginner', 10),

-- 6. Meditazione Loving-Kindness
('loving-kindness', 'meditation', 'Meditazione Loving-Kindness',
 'Meditazione Metta: invia amore e compassione a te stesso e agli altri attraverso frasi guidate.',
 'Aumenta emozioni positive, empatia e connessione sociale. Riduce autocritica e depressione (Fredrickson et al., 2008).',
 10,
 '[{"step": 1, "instruction": "Chiudi gli occhi e porta le mani al cuore", "duration": 15},
   {"step": 2, "instruction": "Ripeti: Che io possa essere felice, che io possa essere in pace", "duration": 90},
   {"step": 3, "instruction": "Pensa a una persona cara. Che tu possa essere felice...", "duration": 90},
   {"step": 4, "instruction": "Pensa a una persona neutra. Invia gli stessi auguri", "duration": 90},
   {"step": 5, "instruction": "Pensa a una persona difficile. Prova a inviare compassione", "duration": 90},
   {"step": 6, "instruction": "Estendi a tutti gli esseri: Che tutti possano essere felici", "duration": 60}]'::jsonb,
 'heart_pulse', '{"color": "#F48FB1", "pulse_speed": "slow"}'::jsonb,
 ARRAY['autocritica', 'depressione', 'isolamento', 'rabbia'],
 'intermediate', 10),

-- 7. Diario della Gratitudine
('gratitude-journal', 'journaling', 'Diario della Gratitudine',
 'Scrivi 3 cose per cui sei grato oggi. La gratitudine riwira il cervello verso il positivo.',
 'La pratica regolare della gratitudine migliora il benessere soggettivo del 25% (Emmons & McCullough, 2003).',
 5,
 '[{"step": 1, "instruction": "Pensa alla tua giornata. Cosa è andato bene?", "duration": 30},
   {"step": 2, "instruction": "Scrivi la prima cosa per cui sei grato", "duration": 60},
   {"step": 3, "instruction": "Scrivi la seconda cosa per cui sei grato", "duration": 60},
   {"step": 4, "instruction": "Scrivi la terza cosa per cui sei grato", "duration": 60},
   {"step": 5, "instruction": "Rileggi e lascia che la gratitudine ti riempia", "duration": 30}]'::jsonb,
 'sparkle', '{"color": "#FFD54F", "particles": true}'::jsonb,
 ARRAY['negatività', 'depressione', 'ruminazione'],
 'beginner', 8),

-- 8. Visualizzazione del Luogo Sicuro
('safe-place', 'visualization', 'Il Mio Luogo Sicuro',
 'Crea e visita mentalmente un luogo sicuro e protetto dove puoi rifugiarti nei momenti difficili.',
 'Tecnica EMDR di stabilizzazione. Crea una risorsa interna di sicurezza utilizzabile in momenti di crisi (Shapiro, 2001).',
 8,
 '[{"step": 1, "instruction": "Chiudi gli occhi. Immagina un luogo dove ti senti completamente al sicuro", "duration": 30},
   {"step": 2, "instruction": "Osserva i dettagli: colori, forme, luce", "duration": 60},
   {"step": 3, "instruction": "Nota i suoni di questo luogo", "duration": 45},
   {"step": 4, "instruction": "Senti la temperatura, il terreno sotto i piedi", "duration": 45},
   {"step": 5, "instruction": "Nota gli odori e i profumi", "duration": 30},
   {"step": 6, "instruction": "Senti la sicurezza e la pace che questo luogo ti dona", "duration": 60},
   {"step": 7, "instruction": "Dai un nome a questo luogo. Potrai tornarci quando vuoi", "duration": 30}]'::jsonb,
 'landscape', '{"color": "#80CBC4", "ambient": true}'::jsonb,
 ARRAY['ansia', 'panico', 'trauma', 'insicurezza'],
 'beginner', 10),

-- 9. Ristrutturazione Cognitiva
('cognitive-restructuring', 'cbt', 'Ristrutturazione Cognitiva',
 'Identifica e sfida i pensieri automatici negativi. Sostituiscili con pensieri più equilibrati e realistici.',
 'Tecnica core della CBT. Riduce distorsioni cognitive e migliora la regolazione emotiva (Beck, 1979).',
 10,
 '[{"step": 1, "instruction": "Scrivi il pensiero negativo che ti tormenta", "duration": 60},
   {"step": 2, "instruction": "Che emozione ti provoca? Quanto è intensa (0-10)?", "duration": 30},
   {"step": 3, "instruction": "Quali prove supportano questo pensiero?", "duration": 90},
   {"step": 4, "instruction": "Quali prove lo contraddicono?", "duration": 90},
   {"step": 5, "instruction": "Cosa direbbe un amico caro in questa situazione?", "duration": 60},
   {"step": 6, "instruction": "Riscrivi il pensiero in modo più equilibrato", "duration": 90},
   {"step": 7, "instruction": "Come ti senti ora (0-10)?", "duration": 15}]'::jsonb,
 'thought_bubble', '{"color": "#90CAF9", "transform": true}'::jsonb,
 ARRAY['ruminazione', 'ansia', 'depressione', 'autocritica'],
 'intermediate', 12),

-- 10. Mindfulness del Respiro
('breath-awareness', 'mindfulness', 'Mindfulness del Respiro',
 'Osserva semplicemente il respiro senza modificarlo. Quando la mente vaga, riportala gentilmente al respiro.',
 'Base della meditazione mindfulness. Migliora attenzione, riduce reattività emotiva (Kabat-Zinn, 1994).',
 7,
 '[{"step": 1, "instruction": "Siediti comodamente con la schiena dritta", "duration": 10},
   {"step": 2, "instruction": "Chiudi gli occhi. Nota il respiro naturale", "duration": 30},
   {"step": 3, "instruction": "Osserva dove senti il respiro: naso, petto, addome", "duration": 60},
   {"step": 4, "instruction": "Non modificare nulla. Solo osserva", "duration": 120},
   {"step": 5, "instruction": "Quando la mente vaga, notalo gentilmente e torna al respiro", "duration": 120},
   {"step": 6, "instruction": "Gradualmente espandi la consapevolezza a tutto il corpo", "duration": 60}]'::jsonb,
 'breathing_wave', '{"color": "#B2DFDB", "wave_speed": "natural"}'::jsonb,
 ARRAY['ansia', 'stress', 'distrazione', 'ruminazione'],
 'beginner', 8),

-- 11. Camminata Consapevole
('mindful-walking', 'mindfulness', 'Camminata Consapevole',
 'Cammina lentamente prestando attenzione a ogni passo, al contatto con il suolo, al movimento del corpo.',
 'Combina benefici dell''attività fisica con la mindfulness. Riduce ruminazione e migliora l''umore (Teychenne et al., 2020).',
 10,
 '[{"step": 1, "instruction": "Alzati e trova uno spazio dove camminare (anche piccolo)", "duration": 15},
   {"step": 2, "instruction": "Fai un respiro profondo. Inizia a camminare lentamente", "duration": 30},
   {"step": 3, "instruction": "Nota il sollevamento del piede dal pavimento", "duration": 90},
   {"step": 4, "instruction": "Senti il movimento della gamba nell''aria", "duration": 90},
   {"step": 5, "instruction": "Nota il contatto del piede che torna a terra", "duration": 90},
   {"step": 6, "instruction": "Sincronizza il respiro con i passi", "duration": 120},
   {"step": 7, "instruction": "Fermati. Senti il tuo corpo radicato a terra", "duration": 30}]'::jsonb,
 'footsteps', '{"color": "#A5D6A7", "step_animation": true}'::jsonb,
 ARRAY['ruminazione', 'sedentarietà', 'stress', 'agitazione'],
 'beginner', 8),

-- 12. Compassione per Sé
('self-compassion', 'meditation', 'Esercizio di Auto-Compassione',
 'Pratica di Kristin Neff: riconosci la sofferenza, ricordati che è umano soffrire, offri gentilezza a te stesso.',
 'L''auto-compassione riduce ansia, depressione e autocritica più efficacemente dell''autostima (Neff & Germer, 2013).',
 8,
 '[{"step": 1, "instruction": "Pensa a qualcosa che ti fa soffrire in questo momento", "duration": 30},
   {"step": 2, "instruction": "Metti una mano sul cuore. Di'': Questo è un momento di sofferenza", "duration": 30},
   {"step": 3, "instruction": "Ricorda: la sofferenza è parte dell''esperienza umana. Non sei solo", "duration": 45},
   {"step": 4, "instruction": "Di'' a te stesso: Che io possa darmi la gentilezza di cui ho bisogno", "duration": 30},
   {"step": 5, "instruction": "Che io possa accettarmi così come sono", "duration": 30},
   {"step": 6, "instruction": "Che io possa perdonarmi", "duration": 30},
   {"step": 7, "instruction": "Resta con questa sensazione di calore e gentilezza", "duration": 60},
   {"step": 8, "instruction": "Quando sei pronto, apri gli occhi lentamente", "duration": 15}]'::jsonb,
 'heart_glow', '{"color": "#F8BBD0", "warmth": true}'::jsonb,
 ARRAY['autocritica', 'vergogna', 'depressione', 'perfezionismo'],
 'intermediate', 10);
