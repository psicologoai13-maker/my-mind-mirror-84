// Centralized Metric Configuration - All ~40 trackable metrics
// This file defines the visual configuration for every metric in the app

export type MetricCategory = 'vitali' | 'emozioni' | 'psicologia' | 'aree_vita' | 'corpo';

export interface MetricConfig {
  key: string;
  label: string;
  icon: string;
  color: string;
  category: MetricCategory;
  isNegative?: boolean; // If true, lower = better (e.g., anxiety, rumination)
  description: string;
  source: 'vitals' | 'emotions' | 'psychology' | 'life_areas' | 'body';
}

// === PARAMETRI VITALI (4) ===
export const VITAL_METRICS: MetricConfig[] = [
  { key: 'mood', label: 'Umore', icon: '😌', color: 'hsl(150, 60%, 45%)', category: 'vitali', source: 'vitals', description: 'Il tuo stato emotivo generale' },
  { key: 'anxiety', label: 'Ansia', icon: '😰', color: 'hsl(25, 80%, 55%)', category: 'vitali', source: 'vitals', isNegative: true, description: 'Livello di ansia percepita' },
  { key: 'energy', label: 'Energia', icon: '⚡', color: 'hsl(45, 80%, 50%)', category: 'vitali', source: 'vitals', description: 'Vitalità e carica energetica' },
  { key: 'sleep', label: 'Sonno', icon: '💤', color: 'hsl(260, 60%, 55%)', category: 'vitali', source: 'vitals', description: 'Qualità del riposo notturno' },
];

// === EMOZIONI (14) ===
export const EMOTION_METRICS: MetricConfig[] = [
  // Primary emotions
  { key: 'joy', label: 'Gioia', icon: '😊', color: 'hsl(50, 90%, 50%)', category: 'emozioni', source: 'emotions', description: 'Felicità e contentezza' },
  { key: 'sadness', label: 'Tristezza', icon: '😢', color: 'hsl(210, 60%, 50%)', category: 'emozioni', source: 'emotions', isNegative: true, description: 'Malinconia e tristezza' },
  { key: 'anger', label: 'Rabbia', icon: '😠', color: 'hsl(0, 80%, 50%)', category: 'emozioni', source: 'emotions', isNegative: true, description: 'Frustrazione e rabbia' },
  { key: 'fear', label: 'Paura', icon: '😨', color: 'hsl(270, 60%, 50%)', category: 'emozioni', source: 'emotions', isNegative: true, description: 'Ansia e preoccupazione' },
  { key: 'apathy', label: 'Apatia', icon: '😶', color: 'hsl(220, 20%, 50%)', category: 'emozioni', source: 'emotions', isNegative: true, description: 'Mancanza di interesse' },
  // Secondary emotions
  { key: 'hope', label: 'Speranza', icon: '🌟', color: 'hsl(40, 85%, 55%)', category: 'emozioni', source: 'emotions', description: 'Ottimismo per il futuro' },
  { key: 'excitement', label: 'Entusiasmo', icon: '🎉', color: 'hsl(330, 80%, 55%)', category: 'emozioni', source: 'emotions', description: 'Energia positiva ed eccitazione' },
  { key: 'frustration', label: 'Frustrazione', icon: '😤', color: 'hsl(15, 75%, 50%)', category: 'emozioni', source: 'emotions', isNegative: true, description: 'Blocco e impotenza' },
  { key: 'shame', label: 'Vergogna', icon: '😳', color: 'hsl(350, 60%, 55%)', category: 'emozioni', source: 'emotions', isNegative: true, description: 'Imbarazzo e disagio' },
  { key: 'jealousy', label: 'Gelosia', icon: '😒', color: 'hsl(90, 40%, 45%)', category: 'emozioni', source: 'emotions', isNegative: true, description: 'Invidia e possessività' },
  { key: 'nostalgia', label: 'Nostalgia', icon: '🥹', color: 'hsl(200, 50%, 55%)', category: 'emozioni', source: 'emotions', description: 'Ricordi e malinconia dolce' },
  { key: 'nervousness', label: 'Nervosismo', icon: '😬', color: 'hsl(30, 70%, 50%)', category: 'emozioni', source: 'emotions', isNegative: true, description: 'Tensione e agitazione' },
  { key: 'overwhelm', label: 'Sopraffazione', icon: '🤯', color: 'hsl(280, 60%, 50%)', category: 'emozioni', source: 'emotions', isNegative: true, description: 'Sentirsi sovraccarico' },
  { key: 'disappointment', label: 'Delusione', icon: '😞', color: 'hsl(230, 40%, 50%)', category: 'emozioni', source: 'emotions', isNegative: true, description: 'Aspettative non soddisfatte' },
];

// === PSICOLOGIA (16) ===
export const PSYCHOLOGY_METRICS: MetricConfig[] = [
  // Positive metrics
  { key: 'mental_clarity', label: 'Chiarezza', icon: '🧠', color: 'hsl(200, 70%, 50%)', category: 'psicologia', source: 'psychology', description: 'Lucidità mentale e focus' },
  { key: 'self_efficacy', label: 'Autoefficacia', icon: '💫', color: 'hsl(280, 60%, 55%)', category: 'psicologia', source: 'psychology', description: 'Fiducia nelle proprie capacità' },
  { key: 'motivation', label: 'Motivazione', icon: '🚀', color: 'hsl(340, 70%, 55%)', category: 'psicologia', source: 'psychology', description: 'Spinta verso i tuoi obiettivi' },
  { key: 'concentration', label: 'Concentrazione', icon: '🎯', color: 'hsl(220, 70%, 55%)', category: 'psicologia', source: 'psychology', description: 'Capacità di focus prolungato' },
  { key: 'gratitude', label: 'Gratitudine', icon: '🙏', color: 'hsl(160, 60%, 45%)', category: 'psicologia', source: 'psychology', description: 'Apprezzamento per le cose positive' },
  { key: 'self_worth', label: 'Autostima', icon: '💖', color: 'hsl(350, 70%, 55%)', category: 'psicologia', source: 'psychology', description: 'Valore che dai a te stesso' },
  { key: 'coping_ability', label: 'Resilienza', icon: '🛡️', color: 'hsl(170, 55%, 45%)', category: 'psicologia', source: 'psychology', description: 'Capacità di gestire lo stress' },
  { key: 'sunlight_exposure', label: 'Luce Solare', icon: '☀️', color: 'hsl(45, 90%, 55%)', category: 'psicologia', source: 'psychology', description: 'Esposizione alla luce naturale' },
  // Negative metrics (lower = better)
  { key: 'rumination', label: 'Ruminazione', icon: '🔄', color: 'hsl(0, 60%, 50%)', category: 'psicologia', source: 'psychology', isNegative: true, description: 'Pensieri ripetitivi negativi' },
  { key: 'burnout_level', label: 'Burnout', icon: '🔥', color: 'hsl(15, 80%, 50%)', category: 'psicologia', source: 'psychology', isNegative: true, description: 'Esaurimento fisico e mentale' },
  { key: 'somatic_tension', label: 'Tensione', icon: '😣', color: 'hsl(30, 70%, 50%)', category: 'psicologia', source: 'psychology', isNegative: true, description: 'Tensione fisica nel corpo' },
  { key: 'irritability', label: 'Irritabilità', icon: '😤', color: 'hsl(5, 70%, 55%)', category: 'psicologia', source: 'psychology', isNegative: true, description: 'Facilità ad arrabbiarsi' },
  { key: 'loneliness_perceived', label: 'Solitudine', icon: '🌙', color: 'hsl(240, 50%, 50%)', category: 'psicologia', source: 'psychology', isNegative: true, description: 'Senso di isolamento percepito' },
  { key: 'guilt', label: 'Senso di Colpa', icon: '😔', color: 'hsl(270, 40%, 45%)', category: 'psicologia', source: 'psychology', isNegative: true, description: 'Sensi di colpa persistenti' },
  { key: 'intrusive_thoughts', label: 'Pensieri Intrusivi', icon: '💭', color: 'hsl(260, 50%, 50%)', category: 'psicologia', source: 'psychology', isNegative: true, description: 'Pensieri indesiderati ricorrenti' },
  { key: 'appetite_changes', label: 'Appetito', icon: '🍽️', color: 'hsl(20, 60%, 50%)', category: 'psicologia', source: 'psychology', isNegative: true, description: 'Cambiamenti nell\'appetito' },
];

// === AREE DELLA VITA (6) ===
export const LIFE_AREA_METRICS: MetricConfig[] = [
  { key: 'work', label: 'Lavoro', icon: '💼', color: 'hsl(220, 60%, 50%)', category: 'aree_vita', source: 'life_areas', description: 'Soddisfazione professionale' },
  { key: 'love', label: 'Amore', icon: '❤️', color: 'hsl(350, 80%, 55%)', category: 'aree_vita', source: 'life_areas', description: 'Relazioni romantiche' },
  { key: 'social', label: 'Sociale', icon: '👥', color: 'hsl(180, 55%, 45%)', category: 'aree_vita', source: 'life_areas', description: 'Amicizie e relazioni sociali' },
  { key: 'health', label: 'Salute', icon: '🏃', color: 'hsl(140, 60%, 45%)', category: 'aree_vita', source: 'life_areas', description: 'Benessere fisico' },
  { key: 'growth', label: 'Crescita', icon: '🌱', color: 'hsl(100, 55%, 45%)', category: 'aree_vita', source: 'life_areas', description: 'Sviluppo personale' },
  { key: 'school', label: 'Studio', icon: '📚', color: 'hsl(260, 50%, 55%)', category: 'aree_vita', source: 'life_areas', description: 'Percorso educativo' },
];

// === ALL METRICS ===
export const ALL_METRICS: MetricConfig[] = [
  ...VITAL_METRICS,
  ...EMOTION_METRICS,
  ...PSYCHOLOGY_METRICS,
  ...LIFE_AREA_METRICS,
];

// Helper functions
export function getMetricConfig(key: string): MetricConfig | undefined {
  return ALL_METRICS.find(m => m.key === key);
}

export function getMetricsByCategory(category: MetricCategory): MetricConfig[] {
  return ALL_METRICS.filter(m => m.category === category);
}

export function getMetricsBySource(source: MetricConfig['source']): MetricConfig[] {
  return ALL_METRICS.filter(m => m.source === source);
}
