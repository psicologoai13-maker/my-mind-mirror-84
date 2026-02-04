// Clinical Domains Configuration v2.0
// Riorganizzazione clinica completa con ~66 metriche

export type DomainId = 'emotional' | 'activation' | 'cognitive' | 'behavioral' | 'somatic' | 'resources' | 'functioning' | 'safety';
export type MetricSource = 'vitals' | 'emotions' | 'psychology' | 'life_areas';

export interface ClinicalMetric {
  key: string;
  label: string;
  icon: string;
  color: string;
  domain: DomainId;
  source: MetricSource;
  isNegative: boolean; // If true, lower values = better (e.g., anxiety)
  description: string;
}

export interface ClinicalDomain {
  id: DomainId;
  label: string;
  icon: string;
  description: string;
  color: string;
}

// 8 Domini Clinici
export const CLINICAL_DOMAINS: ClinicalDomain[] = [
  {
    id: 'emotional',
    label: 'Stato Emotivo',
    icon: '💜',
    description: 'Il tuo spettro emotivo completo',
    color: 'hsl(280, 60%, 55%)'
  },
  {
    id: 'activation',
    label: 'Attivazione',
    icon: '⚡',
    description: 'Livello di energia e tensione',
    color: 'hsl(45, 80%, 50%)'
  },
  {
    id: 'cognitive',
    label: 'Cognitivo',
    icon: '🧠',
    description: 'Chiarezza e focus mentale',
    color: 'hsl(200, 70%, 50%)'
  },
  {
    id: 'behavioral',
    label: 'Comportamentale',
    icon: '🎭',
    description: 'Pattern di azione e evitamento',
    color: 'hsl(170, 60%, 45%)'
  },
  {
    id: 'somatic',
    label: 'Somatico',
    icon: '💤',
    description: 'Benessere fisico e riposo',
    color: 'hsl(260, 60%, 55%)'
  },
  {
    id: 'resources',
    label: 'Risorse Personali',
    icon: '💪',
    description: 'Forze e capacità interiori',
    color: 'hsl(25, 80%, 55%)'
  },
  {
    id: 'functioning',
    label: 'Aree della Vita',
    icon: '🧭',
    description: 'Qualità della vita quotidiana',
    color: 'hsl(150, 60%, 45%)'
  },
  {
    id: 'safety',
    label: 'Sicurezza',
    icon: '🚨',
    description: 'Indicatori critici di rischio',
    color: 'hsl(0, 70%, 55%)'
  }
];

// ═══════════════════════════════════════════════════════════════
// TUTTE LE ~66 METRICHE ORGANIZZATE PER DOMINIO
// ═══════════════════════════════════════════════════════════════

export const ALL_CLINICAL_METRICS: ClinicalMetric[] = [
  // ═══════════════════════════════════════════════════════════════
  // STATO EMOTIVO (20 emozioni)
  // ═══════════════════════════════════════════════════════════════
  {
    key: 'mood',
    label: 'Umore',
    icon: '😌',
    color: 'hsl(150, 60%, 45%)',
    domain: 'emotional',
    source: 'vitals',
    isNegative: false,
    description: 'Il tuo stato emotivo generale'
  },
  {
    key: 'joy',
    label: 'Gioia',
    icon: '😊',
    color: 'hsl(45, 85%, 55%)',
    domain: 'emotional',
    source: 'emotions',
    isNegative: false,
    description: 'Felicità e contentezza'
  },
  {
    key: 'sadness',
    label: 'Tristezza',
    icon: '😢',
    color: 'hsl(210, 60%, 50%)',
    domain: 'emotional',
    source: 'emotions',
    isNegative: true,
    description: 'Sentimenti di malinconia'
  },
  {
    key: 'anger',
    label: 'Rabbia',
    icon: '😠',
    color: 'hsl(0, 70%, 55%)',
    domain: 'emotional',
    source: 'emotions',
    isNegative: true,
    description: 'Frustrazione intensa'
  },
  {
    key: 'fear',
    label: 'Paura',
    icon: '😨',
    color: 'hsl(270, 50%, 55%)',
    domain: 'emotional',
    source: 'emotions',
    isNegative: true,
    description: 'Preoccupazione e timore'
  },
  {
    key: 'disgust',
    label: 'Disgusto',
    icon: '🤢',
    color: 'hsl(80, 50%, 40%)',
    domain: 'emotional',
    source: 'emotions',
    isNegative: true,
    description: 'Avversione e repulsione'
  },
  {
    key: 'surprise',
    label: 'Sorpresa',
    icon: '😲',
    color: 'hsl(190, 70%, 50%)',
    domain: 'emotional',
    source: 'emotions',
    isNegative: false,
    description: 'Reazione all\'inaspettato'
  },
  {
    key: 'apathy',
    label: 'Apatia',
    icon: '😐',
    color: 'hsl(220, 20%, 55%)',
    domain: 'emotional',
    source: 'emotions',
    isNegative: true,
    description: 'Mancanza di interesse'
  },
  {
    key: 'shame',
    label: 'Vergogna',
    icon: '😳',
    color: 'hsl(340, 50%, 55%)',
    domain: 'emotional',
    source: 'emotions',
    isNegative: true,
    description: 'Imbarazzo e disagio sociale'
  },
  {
    key: 'jealousy',
    label: 'Gelosia',
    icon: '😒',
    color: 'hsl(90, 40%, 45%)',
    domain: 'emotional',
    source: 'emotions',
    isNegative: true,
    description: 'Invidia e possessività'
  },
  {
    key: 'hope',
    label: 'Speranza',
    icon: '🌟',
    color: 'hsl(50, 80%, 55%)',
    domain: 'emotional',
    source: 'emotions',
    isNegative: false,
    description: 'Ottimismo per il futuro'
  },
  {
    key: 'frustration',
    label: 'Frustrazione',
    icon: '😤',
    color: 'hsl(15, 70%, 55%)',
    domain: 'emotional',
    source: 'emotions',
    isNegative: true,
    description: 'Blocco e impotenza'
  },
  {
    key: 'nostalgia',
    label: 'Nostalgia',
    icon: '🥹',
    color: 'hsl(35, 60%, 50%)',
    domain: 'emotional',
    source: 'emotions',
    isNegative: false,
    description: 'Ricordi dolceamari'
  },
  {
    key: 'excitement',
    label: 'Eccitazione',
    icon: '🤩',
    color: 'hsl(320, 70%, 55%)',
    domain: 'emotional',
    source: 'emotions',
    isNegative: false,
    description: 'Entusiasmo e attesa'
  },
  {
    key: 'disappointment',
    label: 'Delusione',
    icon: '😞',
    color: 'hsl(200, 30%, 50%)',
    domain: 'emotional',
    source: 'emotions',
    isNegative: true,
    description: 'Aspettative non soddisfatte'
  },
  {
    key: 'serenity',
    label: 'Serenità',
    icon: '😌',
    color: 'hsl(180, 50%, 50%)',
    domain: 'emotional',
    source: 'emotions',
    isNegative: false,
    description: 'Calma interiore e pace'
  },
  {
    key: 'pride',
    label: 'Orgoglio',
    icon: '🦁',
    color: 'hsl(40, 70%, 50%)',
    domain: 'emotional',
    source: 'emotions',
    isNegative: false,
    description: 'Soddisfazione per i risultati'
  },
  {
    key: 'affection',
    label: 'Affetto',
    icon: '🤗',
    color: 'hsl(350, 60%, 60%)',
    domain: 'emotional',
    source: 'emotions',
    isNegative: false,
    description: 'Calore e tenerezza verso gli altri'
  },
  {
    key: 'curiosity',
    label: 'Curiosità',
    icon: '🔍',
    color: 'hsl(200, 60%, 55%)',
    domain: 'emotional',
    source: 'emotions',
    isNegative: false,
    description: 'Interesse e voglia di esplorare'
  },
  {
    key: 'guilt',
    label: 'Senso di Colpa',
    icon: '😔',
    color: 'hsl(240, 35%, 50%)',
    domain: 'emotional',
    source: 'psychology',
    isNegative: true,
    description: 'Rimpianti e colpe'
  },

  // ═══════════════════════════════════════════════════════════════
  // ATTIVAZIONE & AROUSAL (8 metriche)
  // ═══════════════════════════════════════════════════════════════
  {
    key: 'anxiety',
    label: 'Ansia',
    icon: '😰',
    color: 'hsl(0, 70%, 55%)',
    domain: 'activation',
    source: 'vitals',
    isNegative: true,
    description: 'Tensione e preoccupazione'
  },
  {
    key: 'energy',
    label: 'Energia',
    icon: '⚡',
    color: 'hsl(45, 80%, 50%)',
    domain: 'activation',
    source: 'vitals',
    isNegative: false,
    description: 'Vitalità e dinamismo'
  },
  {
    key: 'nervousness',
    label: 'Nervosismo',
    icon: '😬',
    color: 'hsl(35, 70%, 55%)',
    domain: 'activation',
    source: 'emotions',
    isNegative: true,
    description: 'Agitazione interiore'
  },
  {
    key: 'overwhelm',
    label: 'Sopraffazione',
    icon: '🤯',
    color: 'hsl(0, 60%, 55%)',
    domain: 'activation',
    source: 'emotions',
    isNegative: true,
    description: 'Sentirsi sopraffatti'
  },
  {
    key: 'burnout_level',
    label: 'Burnout',
    icon: '🔥',
    color: 'hsl(15, 75%, 50%)',
    domain: 'activation',
    source: 'psychology',
    isNegative: true,
    description: 'Esaurimento da stress cronico'
  },
  {
    key: 'irritability',
    label: 'Irritabilità',
    icon: '😡',
    color: 'hsl(5, 65%, 55%)',
    domain: 'activation',
    source: 'psychology',
    isNegative: true,
    description: 'Facilità ad irritarsi'
  },
  {
    key: 'racing_thoughts',
    label: 'Pensieri Accelerati',
    icon: '💨',
    color: 'hsl(180, 50%, 50%)',
    domain: 'activation',
    source: 'psychology',
    isNegative: true,
    description: 'Mente che corre veloce'
  },
  {
    key: 'emotional_regulation',
    label: 'Regolazione Emotiva',
    icon: '🎚️',
    color: 'hsl(160, 55%, 50%)',
    domain: 'activation',
    source: 'psychology',
    isNegative: false,
    description: 'Capacità di gestire le emozioni'
  },

  // ═══════════════════════════════════════════════════════════════
  // COGNITIVO (6 metriche)
  // ═══════════════════════════════════════════════════════════════
  {
    key: 'mental_clarity',
    label: 'Chiarezza Mentale',
    icon: '💡',
    color: 'hsl(200, 70%, 50%)',
    domain: 'cognitive',
    source: 'psychology',
    isNegative: false,
    description: 'Lucidità di pensiero'
  },
  {
    key: 'concentration',
    label: 'Concentrazione',
    icon: '🎯',
    color: 'hsl(210, 65%, 55%)',
    domain: 'cognitive',
    source: 'psychology',
    isNegative: false,
    description: 'Capacità di focus'
  },
  {
    key: 'rumination',
    label: 'Ruminazione',
    icon: '🔄',
    color: 'hsl(230, 50%, 55%)',
    domain: 'cognitive',
    source: 'psychology',
    isNegative: true,
    description: 'Pensieri ripetitivi'
  },
  {
    key: 'intrusive_thoughts',
    label: 'Pensieri Intrusivi',
    icon: '💭',
    color: 'hsl(250, 45%, 55%)',
    domain: 'cognitive',
    source: 'psychology',
    isNegative: true,
    description: 'Pensieri indesiderati'
  },
  {
    key: 'dissociation',
    label: 'Dissociazione',
    icon: '🌫️',
    color: 'hsl(220, 30%, 50%)',
    domain: 'cognitive',
    source: 'psychology',
    isNegative: true,
    description: 'Distacco dalla realtà'
  },
  {
    key: 'confusion',
    label: 'Confusione',
    icon: '❓',
    color: 'hsl(240, 40%, 55%)',
    domain: 'cognitive',
    source: 'psychology',
    isNegative: true,
    description: 'Difficoltà a pensare chiaramente'
  },

  // ═══════════════════════════════════════════════════════════════
  // COMPORTAMENTALE (4 metriche) - NUOVO DOMINIO
  // ═══════════════════════════════════════════════════════════════
  {
    key: 'avoidance',
    label: 'Evitamento',
    icon: '🏃',
    color: 'hsl(170, 50%, 45%)',
    domain: 'behavioral',
    source: 'psychology',
    isNegative: true,
    description: 'Tendenza ad evitare situazioni'
  },
  {
    key: 'social_withdrawal',
    label: 'Ritiro Sociale',
    icon: '🚪',
    color: 'hsl(190, 45%, 50%)',
    domain: 'behavioral',
    source: 'psychology',
    isNegative: true,
    description: 'Isolarsi dagli altri'
  },
  {
    key: 'compulsive_urges',
    label: 'Impulsi Compulsivi',
    icon: '🔁',
    color: 'hsl(160, 55%, 45%)',
    domain: 'behavioral',
    source: 'psychology',
    isNegative: true,
    description: 'Bisogno di ripetere azioni'
  },
  {
    key: 'procrastination',
    label: 'Procrastinazione',
    icon: '⏰',
    color: 'hsl(180, 40%, 50%)',
    domain: 'behavioral',
    source: 'psychology',
    isNegative: true,
    description: 'Rimandare compiti importanti'
  },

  // ═══════════════════════════════════════════════════════════════
  // SOMATICO (4 metriche)
  // ═══════════════════════════════════════════════════════════════
  {
    key: 'sleep',
    label: 'Qualità Sonno',
    icon: '💤',
    color: 'hsl(260, 60%, 55%)',
    domain: 'somatic',
    source: 'vitals',
    isNegative: false,
    description: 'Come hai dormito'
  },
  {
    key: 'somatic_tension',
    label: 'Tensione Fisica',
    icon: '💆',
    color: 'hsl(280, 50%, 55%)',
    domain: 'somatic',
    source: 'psychology',
    isNegative: true,
    description: 'Tensione muscolare'
  },
  {
    key: 'appetite_changes',
    label: 'Appetito',
    icon: '🍽️',
    color: 'hsl(30, 60%, 50%)',
    domain: 'somatic',
    source: 'psychology',
    isNegative: false,
    description: 'Regolarità alimentare'
  },
  {
    key: 'sunlight_exposure',
    label: 'Esposizione Sole',
    icon: '☀️',
    color: 'hsl(45, 90%, 55%)',
    domain: 'somatic',
    source: 'psychology',
    isNegative: false,
    description: 'Tempo alla luce naturale'
  },

  // ═══════════════════════════════════════════════════════════════
  // RISORSE PERSONALI (12 metriche)
  // ═══════════════════════════════════════════════════════════════
  {
    key: 'self_efficacy',
    label: 'Autoefficacia',
    icon: '🎖️',
    color: 'hsl(25, 80%, 55%)',
    domain: 'resources',
    source: 'psychology',
    isNegative: false,
    description: 'Fiducia nelle tue capacità'
  },
  {
    key: 'self_worth',
    label: 'Autostima',
    icon: '💎',
    color: 'hsl(280, 60%, 55%)',
    domain: 'resources',
    source: 'psychology',
    isNegative: false,
    description: 'Valore personale percepito'
  },
  {
    key: 'gratitude',
    label: 'Gratitudine',
    icon: '🙏',
    color: 'hsl(45, 70%, 50%)',
    domain: 'resources',
    source: 'psychology',
    isNegative: false,
    description: 'Apprezzamento per la vita'
  },
  {
    key: 'motivation',
    label: 'Motivazione',
    icon: '🚀',
    color: 'hsl(15, 75%, 55%)',
    domain: 'resources',
    source: 'psychology',
    isNegative: false,
    description: 'Spinta ad agire'
  },
  {
    key: 'coping_ability',
    label: 'Coping',
    icon: '🛡️',
    color: 'hsl(200, 55%, 50%)',
    domain: 'resources',
    source: 'psychology',
    isNegative: false,
    description: 'Capacità di gestire lo stress'
  },
  {
    key: 'loneliness_perceived',
    label: 'Solitudine',
    icon: '🏝️',
    color: 'hsl(220, 40%, 55%)',
    domain: 'resources',
    source: 'psychology',
    isNegative: true,
    description: 'Senso di isolamento'
  },
  {
    key: 'sense_of_purpose',
    label: 'Senso di Scopo',
    icon: '🎯',
    color: 'hsl(35, 75%, 50%)',
    domain: 'resources',
    source: 'psychology',
    isNegative: false,
    description: 'Direzione e significato nella vita'
  },
  {
    key: 'life_satisfaction',
    label: 'Soddisfazione di Vita',
    icon: '⭐',
    color: 'hsl(50, 80%, 55%)',
    domain: 'resources',
    source: 'psychology',
    isNegative: false,
    description: 'Appagamento generale'
  },
  {
    key: 'perceived_social_support',
    label: 'Supporto Sociale',
    icon: '🤝',
    color: 'hsl(180, 50%, 50%)',
    domain: 'resources',
    source: 'psychology',
    isNegative: false,
    description: 'Sentirsi sostenuti dagli altri'
  },
  {
    key: 'resilience',
    label: 'Resilienza',
    icon: '🌱',
    color: 'hsl(120, 55%, 45%)',
    domain: 'resources',
    source: 'psychology',
    isNegative: false,
    description: 'Capacità di riprendersi'
  },
  {
    key: 'mindfulness',
    label: 'Mindfulness',
    icon: '🧘',
    color: 'hsl(160, 50%, 50%)',
    domain: 'resources',
    source: 'psychology',
    isNegative: false,
    description: 'Presenza nel momento'
  },

  // ═══════════════════════════════════════════════════════════════
  // AREE DELLA VITA (9 aree)
  // ═══════════════════════════════════════════════════════════════
  {
    key: 'work',
    label: 'Lavoro',
    icon: '💼',
    color: 'hsl(200, 60%, 50%)',
    domain: 'functioning',
    source: 'life_areas',
    isNegative: false,
    description: 'Soddisfazione professionale'
  },
  {
    key: 'school',
    label: 'Studio',
    icon: '📚',
    color: 'hsl(220, 60%, 55%)',
    domain: 'functioning',
    source: 'life_areas',
    isNegative: false,
    description: 'Rendimento scolastico'
  },
  {
    key: 'love',
    label: 'Amore',
    icon: '❤️',
    color: 'hsl(350, 70%, 55%)',
    domain: 'functioning',
    source: 'life_areas',
    isNegative: false,
    description: 'Relazioni sentimentali'
  },
  {
    key: 'family',
    label: 'Famiglia',
    icon: '👨‍👩‍👧',
    color: 'hsl(30, 65%, 50%)',
    domain: 'functioning',
    source: 'life_areas',
    isNegative: false,
    description: 'Relazioni familiari'
  },
  {
    key: 'social',
    label: 'Sociale',
    icon: '👥',
    color: 'hsl(180, 55%, 45%)',
    domain: 'functioning',
    source: 'life_areas',
    isNegative: false,
    description: 'Relazioni sociali'
  },
  {
    key: 'health',
    label: 'Salute',
    icon: '🏃',
    color: 'hsl(150, 60%, 45%)',
    domain: 'functioning',
    source: 'life_areas',
    isNegative: false,
    description: 'Benessere fisico'
  },
  {
    key: 'growth',
    label: 'Crescita',
    icon: '🌱',
    color: 'hsl(120, 50%, 45%)',
    domain: 'functioning',
    source: 'life_areas',
    isNegative: false,
    description: 'Sviluppo personale'
  },
  {
    key: 'leisure',
    label: 'Tempo Libero',
    icon: '🎮',
    color: 'hsl(280, 55%, 55%)',
    domain: 'functioning',
    source: 'life_areas',
    isNegative: false,
    description: 'Hobby e relax'
  },
  {
    key: 'finances',
    label: 'Finanze',
    icon: '💰',
    color: 'hsl(140, 60%, 40%)',
    domain: 'functioning',
    source: 'life_areas',
    isNegative: false,
    description: 'Situazione economica'
  },

  // ═══════════════════════════════════════════════════════════════
  // SICUREZZA - Indicatori Critici (3 metriche)
  // ═══════════════════════════════════════════════════════════════
  {
    key: 'suicidal_ideation',
    label: 'Ideazione Suicidaria',
    icon: '⚠️',
    color: 'hsl(0, 80%, 50%)',
    domain: 'safety',
    source: 'psychology',
    isNegative: true,
    description: 'Pensieri di farsi del male - CRITICO'
  },
  {
    key: 'hopelessness',
    label: 'Disperazione',
    icon: '🌑',
    color: 'hsl(0, 60%, 40%)',
    domain: 'safety',
    source: 'psychology',
    isNegative: true,
    description: 'Perdita di speranza - CRITICO'
  },
  {
    key: 'self_harm_urges',
    label: 'Impulsi Autolesionistici',
    icon: '🩹',
    color: 'hsl(0, 70%, 45%)',
    domain: 'safety',
    source: 'psychology',
    isNegative: true,
    description: 'Desiderio di farsi del male - CRITICO'
  }
];

// Helper functions
export const getMetricsByDomain = (domainId: DomainId): ClinicalMetric[] => {
  return ALL_CLINICAL_METRICS.filter(m => m.domain === domainId);
};

export const getMetricByKey = (key: string): ClinicalMetric | undefined => {
  return ALL_CLINICAL_METRICS.find(m => m.key === key);
};

export const getDomainById = (id: DomainId): ClinicalDomain | undefined => {
  return CLINICAL_DOMAINS.find(d => d.id === id);
};

// Semantic color based on value and metric type
export const getSemanticColor = (value: number | null, isNegative: boolean): string => {
  if (value === null) return 'text-muted-foreground';
  
  if (isNegative) {
    // For negative metrics (anxiety, rumination): low = good (green)
    if (value <= 3) return 'text-emerald-500';
    if (value <= 6) return 'text-amber-500';
    return 'text-orange-500';
  } else {
    // For positive metrics (mood, joy): high = good (green)
    if (value >= 7) return 'text-emerald-500';
    if (value >= 4) return 'text-amber-500';
    return 'text-orange-500';
  }
};

// Semantic trend interpretation
export const getSemanticTrend = (trend: 'up' | 'down' | 'stable', isNegative: boolean): {
  color: string;
  isPositive: boolean;
} => {
  if (trend === 'stable') {
    return { color: 'text-muted-foreground', isPositive: true };
  }
  
  if (isNegative) {
    // For negative metrics: down = good
    return trend === 'down' 
      ? { color: 'text-emerald-500', isPositive: true }
      : { color: 'text-orange-500', isPositive: false };
  } else {
    // For positive metrics: up = good
    return trend === 'up'
      ? { color: 'text-emerald-500', isPositive: true }
      : { color: 'text-orange-500', isPositive: false };
  }
};

// Check for safety alerts
export const checkSafetyAlerts = (metricsData: Record<string, { value: number | null }>): {
  hasCriticalAlert: boolean;
  criticalMetrics: string[];
} => {
  const criticalMetrics: string[] = [];
  
  const safetyMetrics = [
    { key: 'suicidal_ideation', threshold: 5 },
    { key: 'hopelessness', threshold: 7 },
    { key: 'self_harm_urges', threshold: 5 }
  ];
  
  for (const metric of safetyMetrics) {
    const value = metricsData[metric.key]?.value;
    if (value !== null && value > metric.threshold) {
      criticalMetrics.push(metric.key);
    }
  }
  
  return {
    hasCriticalAlert: criticalMetrics.length > 0,
    criticalMetrics
  };
};
