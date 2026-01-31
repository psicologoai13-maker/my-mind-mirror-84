// Chart Library Configuration - Dynamic charts that activate based on user data

export type ChartCategory = 'mente' | 'corpo' | 'abitudini' | 'obiettivi';

export interface ChartConfig {
  id: string;
  title: string;
  description: string;
  category: ChartCategory;
  icon: string;
  chartType: 'area' | 'bar' | 'radar' | 'line' | 'heatmap' | 'grid' | 'accordion';
  priority: number; // Lower = higher priority
  requiredData: string[]; // Data keys that must exist
  minDataPoints?: number; // Minimum data points needed
}

// All available charts in the system
export const CHART_LIBRARY: ChartConfig[] = [
  // === MENTE ===
  {
    id: 'wellness_snapshot',
    title: 'Wellness Score',
    description: 'Il tuo punteggio complessivo di benessere',
    category: 'mente',
    icon: '📊',
    chartType: 'grid',
    priority: 1,
    requiredData: ['vitals'],
  },
  {
    id: 'dynamic_vitals',
    title: 'Parametri Vitali',
    description: 'I tuoi indicatori personalizzati',
    category: 'mente',
    icon: '💫',
    chartType: 'grid',
    priority: 2,
    requiredData: ['vitals'],
  },
  {
    id: 'mood_anxiety_trend',
    title: 'Umore vs Ansia',
    description: 'Correlazione tra umore e ansia nel tempo',
    category: 'mente',
    icon: '📈',
    chartType: 'area',
    priority: 3,
    requiredData: ['mood', 'anxiety'],
    minDataPoints: 3,
  },
  {
    id: 'emotional_spectrum',
    title: 'Spettro Emotivo',
    description: 'Distribuzione completa delle emozioni',
    category: 'mente',
    icon: '🌈',
    chartType: 'radar',
    priority: 4,
    requiredData: ['emotions'],
  },
  {
    id: 'emotional_mix',
    title: 'Mix Emotivo',
    description: 'Percentuale delle emozioni principali',
    category: 'mente',
    icon: '🎭',
    chartType: 'bar',
    priority: 5,
    requiredData: ['emotions'],
  },
  {
    id: 'life_balance',
    title: 'Aree della Vita',
    description: 'Equilibrio tra le diverse aree',
    category: 'mente',
    icon: '🧭',
    chartType: 'radar',
    priority: 6,
    requiredData: ['life_areas'],
  },
  {
    id: 'deep_psychology',
    title: 'Psicologia Profonda',
    description: 'Metriche avanzate sul tuo stato mentale',
    category: 'mente',
    icon: '🧠',
    chartType: 'accordion',
    priority: 7,
    requiredData: ['psychology'],
  },
  {
    id: 'correlation_insights',
    title: 'Correlazioni AI',
    description: 'Pattern rilevati tra le tue metriche',
    category: 'mente',
    icon: '✨',
    chartType: 'grid',
    priority: 8,
    requiredData: ['vitals', 'sessions'],
    minDataPoints: 5,
  },

  // === CORPO ===
  {
    id: 'weight_trend',
    title: 'Trend Peso',
    description: 'Andamento del peso nel tempo',
    category: 'corpo',
    icon: '⚖️',
    chartType: 'line',
    priority: 1,
    requiredData: ['weight'],
    minDataPoints: 2,
  },
  {
    id: 'sleep_quality',
    title: 'Qualità Sonno',
    description: 'Analisi delle ore e qualità del sonno',
    category: 'corpo',
    icon: '💤',
    chartType: 'bar',
    priority: 2,
    requiredData: ['sleep_hours'],
  },
  {
    id: 'heart_rate_trend',
    title: 'Battito Cardiaco',
    description: 'Frequenza cardiaca a riposo',
    category: 'corpo',
    icon: '❤️',
    chartType: 'line',
    priority: 3,
    requiredData: ['heart_rate'],
    minDataPoints: 2,
  },
  {
    id: 'activity_summary',
    title: 'Attività Fisica',
    description: 'Passi, calorie e minuti attivi',
    category: 'corpo',
    icon: '🏃',
    chartType: 'grid',
    priority: 4,
    requiredData: ['steps', 'calories'],
  },
  {
    id: 'body_composition',
    title: 'Composizione Corporea',
    description: 'Massa muscolare e grasso corporeo',
    category: 'corpo',
    icon: '💪',
    chartType: 'bar',
    priority: 5,
    requiredData: ['body_fat', 'muscle_mass'],
  },

  // === ABITUDINI ===
  {
    id: 'habits_streak',
    title: 'Streak Abitudini',
    description: 'Consistenza delle tue abitudini',
    category: 'abitudini',
    icon: '🔥',
    chartType: 'grid',
    priority: 1,
    requiredData: ['habits'],
  },
  {
    id: 'habits_heatmap',
    title: 'Mappa Attività',
    description: 'Visualizzazione giornaliera delle abitudini',
    category: 'abitudini',
    icon: '📅',
    chartType: 'heatmap',
    priority: 2,
    requiredData: ['habits'],
    minDataPoints: 7,
  },
  {
    id: 'habits_completion',
    title: 'Tasso Completamento',
    description: 'Percentuale di obiettivi raggiunti',
    category: 'abitudini',
    icon: '✅',
    chartType: 'bar',
    priority: 3,
    requiredData: ['habits'],
  },

  // === OBIETTIVI ===
  {
    id: 'objectives_progress',
    title: 'Progresso Obiettivi',
    description: 'Avanzamento verso i tuoi traguardi',
    category: 'obiettivi',
    icon: '🎯',
    chartType: 'grid',
    priority: 1,
    requiredData: ['objectives'],
  },
  {
    id: 'objectives_timeline',
    title: 'Timeline Obiettivi',
    description: 'Storico progressi nel tempo',
    category: 'obiettivi',
    icon: '📊',
    chartType: 'line',
    priority: 2,
    requiredData: ['objectives'],
    minDataPoints: 3,
  },
];

// Dynamic vitals that can be shown (beyond the basic 4)
export interface VitalMetricConfig {
  key: string;
  label: string;
  icon: string;
  color: string;
  source: 'vitals' | 'psychology' | 'emotions';
  isNegative?: boolean; // If true, lower = better (e.g., anxiety)
  description: string;
}

export const ALL_VITAL_METRICS: VitalMetricConfig[] = [
  // Core vitals
  { key: 'mood', label: 'Umore', icon: '😌', color: 'hsl(150, 60%, 45%)', source: 'vitals', description: 'Il tuo stato emotivo generale' },
  { key: 'anxiety', label: 'Ansia', icon: '😰', color: 'hsl(25, 80%, 55%)', source: 'vitals', isNegative: true, description: 'Livello di ansia percepita' },
  { key: 'energy', label: 'Energia', icon: '⚡', color: 'hsl(45, 80%, 50%)', source: 'vitals', description: 'Vitalità e carica energetica' },
  { key: 'sleep', label: 'Sonno', icon: '💤', color: 'hsl(260, 60%, 55%)', source: 'vitals', description: 'Qualità del riposo notturno' },
  
  // Psychology metrics
  { key: 'mental_clarity', label: 'Chiarezza', icon: '🧠', color: 'hsl(200, 70%, 50%)', source: 'psychology', description: 'Lucidità mentale e focus' },
  { key: 'self_efficacy', label: 'Autoefficacia', icon: '💫', color: 'hsl(280, 60%, 55%)', source: 'psychology', description: 'Fiducia nelle proprie capacità' },
  { key: 'motivation', label: 'Motivazione', icon: '🚀', color: 'hsl(340, 70%, 55%)', source: 'psychology', description: 'Spinta verso i tuoi obiettivi' },
  { key: 'concentration', label: 'Concentrazione', icon: '🎯', color: 'hsl(220, 70%, 55%)', source: 'psychology', description: 'Capacità di focus prolungato' },
  { key: 'gratitude', label: 'Gratitudine', icon: '🙏', color: 'hsl(160, 60%, 45%)', source: 'psychology', description: 'Apprezzamento per le cose positive' },
  { key: 'self_worth', label: 'Autostima', icon: '💖', color: 'hsl(350, 70%, 55%)', source: 'psychology', description: 'Valore che dai a te stesso' },
  
  // Negative psychology metrics (lower = better)
  { key: 'rumination', label: 'Ruminazione', icon: '🔄', color: 'hsl(0, 60%, 50%)', source: 'psychology', isNegative: true, description: 'Pensieri ripetitivi negativi' },
  { key: 'burnout_level', label: 'Burnout', icon: '🔥', color: 'hsl(15, 80%, 50%)', source: 'psychology', isNegative: true, description: 'Esaurimento fisico e mentale' },
  { key: 'somatic_tension', label: 'Tensione', icon: '😣', color: 'hsl(30, 70%, 50%)', source: 'psychology', isNegative: true, description: 'Tensione fisica nel corpo' },
  { key: 'irritability', label: 'Irritabilità', icon: '😤', color: 'hsl(5, 70%, 55%)', source: 'psychology', isNegative: true, description: 'Facilità ad arrabbiarsi' },
  { key: 'loneliness_perceived', label: 'Solitudine', icon: '🌙', color: 'hsl(240, 50%, 50%)', source: 'psychology', isNegative: true, description: 'Senso di isolamento percepito' },
  { key: 'guilt', label: 'Senso di Colpa', icon: '😔', color: 'hsl(270, 40%, 45%)', source: 'psychology', isNegative: true, description: 'Sensi di colpa persistenti' },
  
  // Emotions
  { key: 'joy', label: 'Gioia', icon: '😊', color: 'hsl(50, 90%, 50%)', source: 'emotions', description: 'Felicità e contentezza' },
  { key: 'sadness', label: 'Tristezza', icon: '😢', color: 'hsl(210, 60%, 50%)', source: 'emotions', isNegative: true, description: 'Malinconia e tristezza' },
  { key: 'anger', label: 'Rabbia', icon: '😠', color: 'hsl(0, 80%, 50%)', source: 'emotions', isNegative: true, description: 'Frustrazione e rabbia' },
  { key: 'fear', label: 'Paura', icon: '😨', color: 'hsl(270, 60%, 50%)', source: 'emotions', isNegative: true, description: 'Ansia e preoccupazione' },
];

// Get chart configs for a specific category
export function getChartsForCategory(category: ChartCategory): ChartConfig[] {
  return CHART_LIBRARY
    .filter(c => c.category === category)
    .sort((a, b) => a.priority - b.priority);
}

// Get a specific chart config by ID
export function getChartById(id: string): ChartConfig | undefined {
  return CHART_LIBRARY.find(c => c.id === id);
}

// Get vital metric config by key
export function getVitalMetric(key: string): VitalMetricConfig | undefined {
  return ALL_VITAL_METRICS.find(m => m.key === key);
}
