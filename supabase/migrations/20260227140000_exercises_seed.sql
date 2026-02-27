-- =============================================
-- ARIA V2.0 - Seed 12 Esercizi Clinici
-- =============================================
-- INSERT ... ON CONFLICT (slug) DO NOTHING per sicurezza

INSERT INTO public.exercises (slug, category, title, description, clinical_basis, duration_minutes, steps, animation_type, animation_config, target_symptoms, difficulty, points_reward)
VALUES

-- 1. Respirazione 4-7-8
('breathing-478', 'breathing', 'Respirazione 4-7-8',
 'Tecnica di respirazione calmante ideata dal Dr. Andrew Weil. Inspira per 4 secondi, trattieni per 7, espira lentamente per 8.',
 'Dr. Andrew Weil – attiva il sistema nervoso parasimpatico, riduce cortisolo e frequenza cardiaca. Studi clinici confermano efficacia su ansia e insonnia (Weil, 2015).',
 5,
 '[
   {"step": 1, "instruction": "Trova una posizione comoda, siediti con la schiena dritta e chiudi dolcemente gli occhi.", "duration": 10},
   {"step": 2, "instruction": "Appoggia la punta della lingua dietro gli incisivi superiori. Espira completamente dalla bocca con un soffio.", "duration": 8},
   {"step": 3, "instruction": "Inspira dal naso contando lentamente fino a 4. Senti l''aria riempire i polmoni.", "duration": 4},
   {"step": 4, "instruction": "Trattieni il respiro contando fino a 7. Resta tranquillo, sei al sicuro.", "duration": 7},
   {"step": 5, "instruction": "Espira dalla bocca contando fino a 8, facendo un leggero suono. Lascia andare ogni tensione.", "duration": 8},
   {"step": 6, "instruction": "Ripeti il ciclo inspira-trattieni-espira per almeno 4 volte. Ad ogni ciclo sentirai più calma."}
 ]'::jsonb,
 'breathing_circle',
 '{"inhale": 4, "hold": 7, "exhale": 8, "cycles": 4, "color": "#4FC3F7"}'::jsonb,
 ARRAY['ansia', 'insonnia', 'stress', 'panico', 'agitazione'],
 'beginner', 8),

-- 2. Box Breathing
('box-breathing', 'breathing', 'Box Breathing',
 'Tecnica di respirazione quadrata usata dai Navy SEALs: inspira 4, trattieni 4, espira 4, trattieni 4.',
 'Mark Divine / Navy SEALs – regola il sistema nervoso autonomo e migliora la concentrazione sotto stress. Validata in contesti militari e clinici (Ma et al., 2017).',
 4,
 '[
   {"step": 1, "instruction": "Siediti comodamente con i piedi appoggiati a terra. Chiudi gli occhi e rilassa le spalle.", "duration": 8},
   {"step": 2, "instruction": "Inspira lentamente dal naso contando fino a 4. Immagina di disegnare il primo lato di un quadrato.", "duration": 4},
   {"step": 3, "instruction": "Trattieni il respiro per 4 secondi. Secondo lato del quadrato.", "duration": 4},
   {"step": 4, "instruction": "Espira dalla bocca per 4 secondi. Terzo lato del quadrato.", "duration": 4},
   {"step": 5, "instruction": "Trattieni a polmoni vuoti per 4 secondi. Hai completato il quadrato.", "duration": 4},
   {"step": 6, "instruction": "Ripeti il ciclo per 4-6 volte. Ad ogni quadrato completo, senti più equilibrio."}
 ]'::jsonb,
 'breathing_circle',
 '{"inhale": 4, "hold": 4, "exhale": 4, "hold_empty": 4, "cycles": 6, "color": "#42A5F5"}'::jsonb,
 ARRAY['ansia', 'stress', 'concentrazione', 'agitazione'],
 'beginner', 8),

-- 3. Respirazione Diaframmatica
('diaphragmatic', 'breathing', 'Respirazione Diaframmatica',
 'Respirazione profonda con il diaframma: la pancia si gonfia in inspirazione e si sgonfia in espirazione.',
 'Tecnica base della psicofisiologia clinica. Attiva il nervo vago e il tono parasimpatico, riduce pressione arteriosa e cortisolo (Lehrer & Gevirtz, 2014).',
 5,
 '[
   {"step": 1, "instruction": "Sdraiati o siediti comodamente. Appoggia una mano sul petto e una sulla pancia.", "duration": 10},
   {"step": 2, "instruction": "Inspira dal naso lentamente: la mano sulla pancia si alza, quella sul petto resta ferma.", "duration": 5},
   {"step": 3, "instruction": "Espira dalla bocca con calma: la pancia si abbassa dolcemente. Come un palloncino che si sgonfia.", "duration": 5},
   {"step": 4, "instruction": "Continua a respirare così. Ogni respiro è un''onda calma che ti attraversa.", "duration": 30},
   {"step": 5, "instruction": "Se la mente vaga, riportala gentilmente al movimento della pancia. Nessun giudizio.", "duration": 30}
 ]'::jsonb,
 'breathing_wave',
 '{"inhale": 5, "exhale": 5, "color": "#26C6DA"}'::jsonb,
 ARRAY['ansia', 'stress', 'tensione', 'somatizzazione'],
 'beginner', 8),

-- 4. Coerenza Cardiaca 5-5
('cardiac-coherence', 'breathing', 'Coerenza Cardiaca 5-5',
 'Respirazione ritmica 5 secondi inspira, 5 secondi espira (6 respiri al minuto) per sincronizzare cuore e cervello.',
 'HeartMath Institute – la frequenza di 0.1 Hz (6 respiri/min) massimizza la variabilità cardiaca e lo stato di coerenza fisiologica (McCraty et al., 2009).',
 5,
 '[
   {"step": 1, "instruction": "Siediti comodo e chiudi gli occhi. Porta l''attenzione al centro del petto, come se respirassi dal cuore.", "duration": 10},
   {"step": 2, "instruction": "Inspira dal naso per 5 secondi, lentamente e con dolcezza.", "duration": 5},
   {"step": 3, "instruction": "Espira dalla bocca per 5 secondi, senza forzare. Come un''onda che va e viene.", "duration": 5},
   {"step": 4, "instruction": "Mantieni questo ritmo: 5 secondi dentro, 5 secondi fuori. Il tuo cuore e il tuo respiro si sincronizzano.", "duration": 60},
   {"step": 5, "instruction": "Pensa a qualcosa che ti fa sentire gratitudine o affetto mentre respiri. Lascia che il calore si espanda nel petto.", "duration": 60},
   {"step": 6, "instruction": "Continua per qualche minuto. Stai creando coerenza tra cuore, respiro e mente."}
 ]'::jsonb,
 'breathing_circle',
 '{"inhale": 5, "exhale": 5, "cycles": 30, "color": "#EF5350"}'::jsonb,
 ARRAY['ansia', 'stress', 'instabilità emotiva', 'ipertensione'],
 'beginner', 8),

-- 5. Registro Pensieri (CBT)
('thought-record', 'cbt', 'Registro Pensieri (CBT)',
 'Tecnica core della terapia cognitivo-comportamentale: identifica il pensiero automatico, valuta le prove e trova un pensiero alternativo più equilibrato.',
 'Aaron T. Beck – tecnica fondamentale della CBT. Riduce distorsioni cognitive e migliora la regolazione emotiva (Beck, 1979; Greenberger & Padesky, 1995).',
 10,
 '[
   {"step": 1, "instruction": "Descrivi brevemente la situazione che ti ha turbato. Cosa è successo?", "duration": 60},
   {"step": 2, "instruction": "Quale pensiero ti è venuto in mente automaticamente? Scrivilo esattamente come lo pensi.", "duration": 60},
   {"step": 3, "instruction": "Che emozione provi? Quanto è intensa da 0 a 10?", "duration": 30},
   {"step": 4, "instruction": "Quali fatti concreti supportano questo pensiero? Cerca le prove reali.", "duration": 90},
   {"step": 5, "instruction": "Quali fatti lo contraddicono? Cosa direbbe una persona cara al tuo posto?", "duration": 90},
   {"step": 6, "instruction": "Riscrivi il pensiero in modo più equilibrato e realistico. Quanto ci credi da 0 a 10?", "duration": 60}
 ]'::jsonb,
 'thought_bubble',
 '{"color": "#90CAF9", "transform": true}'::jsonb,
 ARRAY['ruminazione', 'ansia', 'depressione', 'autocritica', 'pensieri negativi'],
 'intermediate', 12),

-- 6. Defusione Cognitiva (ACT)
('cognitive-defusion', 'cbt', 'Defusione Cognitiva (ACT)',
 'Tecnica ACT per prendere distanza dai pensieri dolorosi: osservali come eventi mentali, non come verità assolute.',
 'Steven C. Hayes – Acceptance and Commitment Therapy. La defusione riduce l''impatto dei pensieri negativi senza cercare di cambiarli (Hayes et al., 2006).',
 8,
 '[
   {"step": 1, "instruction": "Pensa al pensiero negativo che ti tormenta di più in questo momento. Tienilo in mente.", "duration": 15},
   {"step": 2, "instruction": "Ora ripetilo nella tua mente aggiungendo prima: Sto avendo il pensiero che... Nota la differenza.", "duration": 30},
   {"step": 3, "instruction": "Prova a ripeterlo con una voce buffa, come un cartone animato. Il contenuto non cambia, ma il potere sì.", "duration": 30},
   {"step": 4, "instruction": "Immagina il pensiero scritto su una foglia che galleggia lungo un ruscello. Guardalo allontanarsi.", "duration": 45},
   {"step": 5, "instruction": "Ringrazia la tua mente: Grazie mente, per questo pensiero. Lo noto e lo lascio andare.", "duration": 30},
   {"step": 6, "instruction": "Torna al presente. Il pensiero è solo un evento mentale, non sei tu e non è la realtà.", "duration": 20}
 ]'::jsonb,
 'leaf_stream',
 '{"color": "#A5D6A7", "animation": "floating_leaves"}'::jsonb,
 ARRAY['ruminazione', 'pensieri intrusivi', 'ansia', 'autocritica'],
 'intermediate', 10),

-- 7. Attivazione Comportamentale
('behavioral-activation', 'cbt', 'Attivazione Comportamentale',
 'Pianifica piccole attività piacevoli o significative per rompere il circolo vizioso dell''inattività e dell''umore basso.',
 'Martell, Addis & Jacobson – tecnica centrale nella CBT per la depressione. L''aumento di attività gratificanti migliora l''umore indipendentemente dalla motivazione iniziale (Martell et al., 2001).',
 12,
 '[
   {"step": 1, "instruction": "Come ti senti in questo momento, da 0 a 10? Non giudicarti, solo osserva.", "duration": 15},
   {"step": 2, "instruction": "Pensa a 3 piccole attività che di solito ti danno piacere o soddisfazione. Anche cose semplici.", "duration": 60},
   {"step": 3, "instruction": "Scegline una che puoi fare oggi, anche per soli 5 minuti. Non deve essere perfetta.", "duration": 30},
   {"step": 4, "instruction": "Pianifica quando e dove la farai. Più è specifico, più è probabile che accada.", "duration": 30},
   {"step": 5, "instruction": "Ora fai l''attività, oppure impegnati a farla nel momento che hai scelto. Il primo passo è il più importante.", "duration": 120},
   {"step": 6, "instruction": "Dopo averla fatta, nota come ti senti. Spesso l''umore migliora anche se non ne avevi voglia."}
 ]'::jsonb,
 'activity_planner',
 '{"color": "#FFB74D", "checkmarks": true}'::jsonb,
 ARRAY['depressione', 'apatia', 'procrastinazione', 'isolamento'],
 'beginner', 10),

-- 8. Grounding 5-4-3-2-1
('grounding-54321', 'mindfulness', 'Grounding 5-4-3-2-1',
 'Tecnica di radicamento sensoriale: identifica 5 cose che vedi, 4 che tocchi, 3 che senti, 2 che annusi, 1 che gusti.',
 'Lisa M. Najavits – Seeking Safety. Interrompe cicli di dissociazione e panico ancorando al presente attraverso i 5 sensi (Najavits, 2002).',
 5,
 '[
   {"step": 1, "instruction": "Fermati un momento. Guarda intorno a te e nomina 5 cose che puoi VEDERE. Descrivile mentalmente.", "duration": 60},
   {"step": 2, "instruction": "Tocca 4 superfici diverse intorno a te. Com''è la sensazione? Ruvido, liscio, caldo, freddo?", "duration": 50},
   {"step": 3, "instruction": "Chiudi gli occhi e ascolta. Identifica 3 suoni diversi nel tuo ambiente.", "duration": 40},
   {"step": 4, "instruction": "Nota 2 odori intorno a te. Se non li senti, avvicina le mani al naso.", "duration": 30},
   {"step": 5, "instruction": "Porta attenzione a 1 sapore nella tua bocca. Bevi un sorso d''acqua se vuoi.", "duration": 20}
 ]'::jsonb,
 'senses_counter',
 '{"color": "#FFB74D", "senses": ["vista", "tatto", "udito", "olfatto", "gusto"]}'::jsonb,
 ARRAY['panico', 'dissociazione', 'ansia', 'flashback', 'derealizzazione'],
 'beginner', 8),

-- 9. Body Scan Progressivo
('body-scan', 'mindfulness', 'Body Scan Progressivo',
 'Scansione corporea guidata dalla testa ai piedi. Porta consapevolezza ad ogni parte del corpo senza giudizio.',
 'Jon Kabat-Zinn – MBSR (Mindfulness-Based Stress Reduction). Riduce tensione muscolare e dissociazione, migliora la propriocezione e il collegamento mente-corpo (Kabat-Zinn, 1990).',
 10,
 '[
   {"step": 1, "instruction": "Sdraiati o siediti comodamente. Chiudi gli occhi e fai tre respiri profondi.", "duration": 15},
   {"step": 2, "instruction": "Porta l''attenzione alla sommità della testa. Nota qualsiasi sensazione, senza giudicare.", "duration": 40},
   {"step": 3, "instruction": "Scendi al viso: fronte, occhi, mascella. Se noti tensione, lasciala sciogliere con il respiro.", "duration": 60},
   {"step": 4, "instruction": "Collo e spalle. Spesso accumuliamo stress qui. Respira in questa zona.", "duration": 60},
   {"step": 5, "instruction": "Braccia, mani, dita. Senti il calore e il formicolio della vita che scorre.", "duration": 50},
   {"step": 6, "instruction": "Torace e addome. Osserva il respiro che muove questa zona come un''onda.", "duration": 60},
   {"step": 7, "instruction": "Schiena, bacino, gambe, piedi. Scendi lentamente fino alle dita dei piedi.", "duration": 60},
   {"step": 8, "instruction": "Ora senti tutto il corpo come un insieme. Sei presente, sei qui, sei intero."}
 ]'::jsonb,
 'body_highlight',
 '{"color": "#81C784", "speed": "slow"}'::jsonb,
 ARRAY['tensione', 'dissociazione', 'stress', 'somatizzazione', 'insonnia'],
 'beginner', 10),

-- 10. Mindfulness 1 Minuto
('mindfulness-1min', 'mindfulness', 'Mindfulness 1 Minuto',
 'Una brevissima pratica di presenza: un minuto per tornare al qui e ora. Perfetta per momenti di stress durante la giornata.',
 'Jon Kabat-Zinn – adattamento breve della pratica MBSR. Anche micro-interventi di mindfulness riducono la reattività allo stress (Creswell, 2017).',
 1,
 '[
   {"step": 1, "instruction": "Fermati. Qualunque cosa tu stia facendo, metti in pausa per un momento.", "duration": 5},
   {"step": 2, "instruction": "Fai un respiro profondo. Senti l''aria che entra e che esce.", "duration": 10},
   {"step": 3, "instruction": "Nota tre cose: cosa vedi, cosa senti, cosa provi nel corpo. Solo osserva.", "duration": 20},
   {"step": 4, "instruction": "Lascia andare qualsiasi pensiero. Non devi fare nulla. Solo essere qui, adesso.", "duration": 20},
   {"step": 5, "instruction": "Un ultimo respiro profondo. Sei tornato al presente. Puoi continuare la tua giornata con più calma.", "duration": 5}
 ]'::jsonb,
 'breathing_wave',
 '{"color": "#B2DFDB", "duration": 60}'::jsonb,
 ARRAY['stress', 'ansia', 'distrazione', 'agitazione', 'sovraccarico'],
 'beginner', 5),

-- 11. Rilassamento Muscolare Progressivo
('progressive-relaxation', 'mindfulness', 'Rilassamento Muscolare Progressivo',
 'Tecnica di Jacobson: contrai ogni gruppo muscolare per 5 secondi, poi rilascia. Senti la differenza tra tensione e rilassamento.',
 'Edmund Jacobson – riduce tensione muscolare cronica, ansia somatica e insonnia. Validato da decenni di ricerca clinica (Jacobson, 1938; Bernstein & Borkovec, 1973).',
 15,
 '[
   {"step": 1, "instruction": "Sdraiati o siediti comodo. Chiudi gli occhi e fai 3 respiri profondi.", "duration": 15},
   {"step": 2, "instruction": "Stringi forte i pugni per 5 secondi... senti la tensione... ora rilascia. Nota la differenza.", "duration": 20},
   {"step": 3, "instruction": "Contrai i bicipiti portando i pugni alle spalle, 5 secondi... e rilascia. Senti le braccia pesanti e calde.", "duration": 20},
   {"step": 4, "instruction": "Alza le spalle fino alle orecchie, tieni 5 secondi... e lascia cadere. Ahh, che sollievo.", "duration": 20},
   {"step": 5, "instruction": "Aggrotta la fronte e stringi gli occhi, 5 secondi... e rilassa tutto il viso. Senti la morbidezza.", "duration": 20},
   {"step": 6, "instruction": "Contrai addome e glutei, tieni forte 5 secondi... e rilascia. La tensione se ne va.", "duration": 20},
   {"step": 7, "instruction": "Contrai cosce e polpacci spingendo i piedi, 5 secondi... e rilascia. Gambe pesanti e rilassate.", "duration": 20},
   {"step": 8, "instruction": "Stringi le dita dei piedi, tieni 5 secondi... e rilascia. Ora resta fermo e senti tutto il corpo sciolto e leggero."}
 ]'::jsonb,
 'muscle_highlight',
 '{"color": "#EF9A9A", "tension_color": "#F44336", "release_color": "#4CAF50"}'::jsonb,
 ARRAY['tensione', 'ansia', 'insonnia', 'stress', 'dolore muscolare'],
 'beginner', 10),

-- 12. Respirazione Pre-Sonno
('sleep-breathing', 'sleep', 'Respirazione Pre-Sonno',
 'Sequenza di respirazione pensata per preparare corpo e mente al sonno. Rallenta il ritmo cardiaco e calma il sistema nervoso.',
 'Adattamento clinico della tecnica 4-7-8 di Weil combinata con rilassamento autogeno di Schultz. Efficace nell''insonnia iniziale (Ong et al., 2014).',
 8,
 '[
   {"step": 1, "instruction": "Sdraiati nel letto a pancia in su. Metti le mani sulla pancia e chiudi gli occhi.", "duration": 10},
   {"step": 2, "instruction": "Fai 3 sospiri profondi. Lascia uscire tutta la tensione della giornata.", "duration": 15},
   {"step": 3, "instruction": "Inspira dal naso per 4 secondi. La pancia si alza dolcemente.", "duration": 4},
   {"step": 4, "instruction": "Trattieni per 7 secondi. Immagina che il corpo diventi sempre più pesante.", "duration": 7},
   {"step": 5, "instruction": "Espira dalla bocca per 8 secondi. Con ogni espiro, affondi un po'' di più nel materasso.", "duration": 8},
   {"step": 6, "instruction": "Ripeti il ciclo. Ad ogni respiro, immagina una luce calda che si spegne lentamente. Buonanotte."}
 ]'::jsonb,
 'breathing_circle',
 '{"inhale": 4, "hold": 7, "exhale": 8, "cycles": 6, "color": "#7E57C2", "ambient": "night"}'::jsonb,
 ARRAY['insonnia', 'ansia notturna', 'ruminazione serale', 'stress'],
 'beginner', 8)

ON CONFLICT (slug) DO NOTHING;
