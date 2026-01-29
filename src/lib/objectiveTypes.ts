// Objective Types Library - Predefined objectives with intelligent input methods

export type ObjectiveInputMethod = 
  | 'auto_body'        // Sync from weight/body_metrics
  | 'auto_habit'       // Sync from related habit
  | 'numeric'          // Direct numeric input via check-in
  | 'milestone'        // Qualitative milestone (yes/achieved)
  | 'counter'          // Incremental counting
  | 'time_based'       // Time/duration tracking
  | 'session_detected'; // Detected by AI in conversations

export type ObjectiveCategory = 'mind' | 'body' | 'study' | 'work' | 'relationships' | 'growth' | 'finance';

export interface ObjectiveMeta {
  key: string;
  label: string;
  icon: string;
  category: ObjectiveCategory;
  description: string;
  inputMethod: ObjectiveInputMethod;
  unit?: string;
  defaultTarget?: number;
  // Sync configuration
  linkedHabit?: string;       // e.g., 'weight' for weight objective
  linkedBodyMetric?: string;  // e.g., 'weight' from body_metrics
  brainDetectable?: boolean;  // AI can detect progress in sessions
  // Validation
  requiresStartingValue?: boolean;
  step?: number;
  min?: number;
  max?: number;
  // UI
  emoji?: string;
  questionTemplate?: string; // For check-ins: "Quanto hai {action} oggi?"
}

// ============= OBJECTIVE TYPES LIBRARY =============

export const OBJECTIVE_TYPES: Record<string, ObjectiveMeta> = {
  // ============= BODY - Corpo (8 objectives) =============
  lose_weight: {
    key: 'lose_weight',
    label: 'Perdere peso',
    icon: 'Scale',
    emoji: '⚖️',
    category: 'body',
    description: 'Raggiungi il tuo peso forma',
    inputMethod: 'auto_body',
    unit: 'kg',
    linkedHabit: 'weight',
    linkedBodyMetric: 'weight',
    requiresStartingValue: true,
    step: 0.1,
    min: 30,
    max: 300,
  },
  gain_weight: {
    key: 'gain_weight',
    label: 'Prendere peso',
    icon: 'Scale',
    emoji: '💪',
    category: 'body',
    description: 'Aumenta la massa corporea',
    inputMethod: 'auto_body',
    unit: 'kg',
    linkedHabit: 'weight',
    linkedBodyMetric: 'weight',
    requiresStartingValue: true,
    step: 0.1,
    min: 30,
    max: 200,
  },
  gain_muscle: {
    key: 'gain_muscle',
    label: 'Aumentare massa muscolare',
    icon: 'Dumbbell',
    emoji: '🏋️',
    category: 'body',
    description: 'Costruisci muscoli e forza',
    inputMethod: 'auto_body',
    unit: 'kg',
    linkedBodyMetric: 'weight',
    requiresStartingValue: true,
    step: 0.5,
  },
  run_distance: {
    key: 'run_distance',
    label: 'Correre una distanza',
    icon: 'PersonStanding',
    emoji: '🏃',
    category: 'body',
    description: 'Raggiungi un obiettivo di corsa',
    inputMethod: 'time_based',
    unit: 'km',
    defaultTarget: 5,
    step: 0.5,
    questionTemplate: 'Quanti km hai corso oggi?',
  },
  complete_marathon: {
    key: 'complete_marathon',
    label: 'Completare una maratona',
    icon: 'Medal',
    emoji: '🏅',
    category: 'body',
    description: 'Prepararti e completare una maratona',
    inputMethod: 'milestone',
    brainDetectable: true,
  },
  flexibility_goal: {
    key: 'flexibility_goal',
    label: 'Migliorare flessibilità',
    icon: 'Stretch',
    emoji: '🧘',
    category: 'body',
    description: 'Aumenta la tua flessibilità',
    inputMethod: 'session_detected',
    brainDetectable: true,
    linkedHabit: 'stretching',
  },
  body_composition: {
    key: 'body_composition',
    label: 'Ridurre % grasso corporeo',
    icon: 'Percent',
    emoji: '📉',
    category: 'body',
    description: 'Migliora la composizione corporea',
    inputMethod: 'numeric',
    unit: '%',
    requiresStartingValue: true,
    step: 0.5,
    min: 5,
    max: 50,
    questionTemplate: 'Qual è la tua % di grasso attuale?',
  },
  physical_strength: {
    key: 'physical_strength',
    label: 'Aumentare forza',
    icon: 'Dumbbell',
    emoji: '💪',
    category: 'body',
    description: 'Diventa più forte',
    inputMethod: 'counter',
    unit: 'kg sollevati',
    linkedHabit: 'strength',
    questionTemplate: 'Qual è il tuo massimale attuale?',
  },

  // ============= MIND - Mente (8 objectives) =============
  reduce_anxiety: {
    key: 'reduce_anxiety',
    label: 'Ridurre ansia',
    icon: 'Heart',
    emoji: '🧘‍♀️',
    category: 'mind',
    description: "Gestisci e riduci l'ansia quotidiana",
    inputMethod: 'session_detected',
    brainDetectable: true,
  },
  improve_sleep: {
    key: 'improve_sleep',
    label: 'Dormire meglio',
    icon: 'Moon',
    emoji: '😴',
    category: 'mind',
    description: 'Migliora la qualità del sonno',
    inputMethod: 'auto_habit',
    unit: 'ore',
    defaultTarget: 8,
    linkedHabit: 'sleep',
    linkedBodyMetric: 'sleep_hours',
  },
  emotional_stability: {
    key: 'emotional_stability',
    label: 'Stabilità emotiva',
    icon: 'HeartHandshake',
    emoji: '⚖️',
    category: 'mind',
    description: 'Raggiungi maggiore equilibrio emotivo',
    inputMethod: 'session_detected',
    brainDetectable: true,
  },
  meditation_habit: {
    key: 'meditation_habit',
    label: 'Meditare regolarmente',
    icon: 'Brain',
    emoji: '🧠',
    category: 'mind',
    description: 'Costruisci una pratica di meditazione',
    inputMethod: 'auto_habit',
    unit: 'min',
    defaultTarget: 15,
    linkedHabit: 'meditation',
  },
  stress_management: {
    key: 'stress_management',
    label: 'Gestire lo stress',
    icon: 'Shield',
    emoji: '🛡️',
    category: 'mind',
    description: 'Impara a gestire lo stress',
    inputMethod: 'session_detected',
    brainDetectable: true,
  },
  self_esteem: {
    key: 'self_esteem',
    label: 'Migliorare autostima',
    icon: 'Star',
    emoji: '⭐',
    category: 'mind',
    description: 'Costruisci una sana autostima',
    inputMethod: 'session_detected',
    brainDetectable: true,
  },
  mindfulness: {
    key: 'mindfulness',
    label: 'Praticare mindfulness',
    icon: 'Eye',
    emoji: '👁️',
    category: 'mind',
    description: 'Vivi più nel presente',
    inputMethod: 'auto_habit',
    linkedHabit: 'mindfulness',
    brainDetectable: true,
  },
  therapy_progress: {
    key: 'therapy_progress',
    label: 'Progresso in terapia',
    icon: 'MessageCircle',
    emoji: '💬',
    category: 'mind',
    description: 'Fai progressi nel tuo percorso terapeutico',
    inputMethod: 'milestone',
    brainDetectable: true,
  },

  // ============= STUDY - Studio (6 objectives) =============
  pass_exam: {
    key: 'pass_exam',
    label: 'Superare esame',
    icon: 'GraduationCap',
    emoji: '🎓',
    category: 'study',
    description: 'Supera un esame importante',
    inputMethod: 'milestone',
    brainDetectable: true,
  },
  study_hours: {
    key: 'study_hours',
    label: 'Studiare X ore a settimana',
    icon: 'Clock',
    emoji: '📖',
    category: 'study',
    description: 'Raggiungi un obiettivo di studio settimanale',
    inputMethod: 'counter',
    unit: 'ore',
    defaultTarget: 20,
    linkedHabit: 'learning',
    questionTemplate: 'Quante ore hai studiato questa settimana?',
  },
  read_books: {
    key: 'read_books',
    label: 'Leggere X libri',
    icon: 'BookOpen',
    emoji: '📚',
    category: 'study',
    description: 'Leggi più libri',
    inputMethod: 'counter',
    unit: 'libri',
    defaultTarget: 12,
    linkedHabit: 'reading',
    questionTemplate: 'Quanti libri hai completato?',
  },
  learn_language: {
    key: 'learn_language',
    label: 'Imparare una lingua',
    icon: 'Languages',
    emoji: '🌍',
    category: 'study',
    description: 'Impara una nuova lingua',
    inputMethod: 'milestone',
    brainDetectable: true,
  },
  complete_course: {
    key: 'complete_course',
    label: 'Completare un corso',
    icon: 'Award',
    emoji: '🏆',
    category: 'study',
    description: 'Completa un corso di formazione',
    inputMethod: 'milestone',
    brainDetectable: true,
  },
  academic_grade: {
    key: 'academic_grade',
    label: 'Raggiungere un voto',
    icon: 'Target',
    emoji: '🎯',
    category: 'study',
    description: 'Ottieni il voto che desideri',
    inputMethod: 'numeric',
    unit: 'voto',
    defaultTarget: 30,
    step: 1,
    min: 0,
    max: 110,
    questionTemplate: 'Che voto hai ottenuto?',
  },

  // ============= WORK - Lavoro (6 objectives) =============
  get_promotion: {
    key: 'get_promotion',
    label: 'Ottenere promozione',
    icon: 'TrendingUp',
    emoji: '📈',
    category: 'work',
    description: 'Raggiungi una promozione lavorativa',
    inputMethod: 'milestone',
    brainDetectable: true,
  },
  change_job: {
    key: 'change_job',
    label: 'Cambiare lavoro',
    icon: 'Briefcase',
    emoji: '💼',
    category: 'work',
    description: 'Trova un nuovo lavoro',
    inputMethod: 'milestone',
    brainDetectable: true,
  },
  productivity: {
    key: 'productivity',
    label: 'Aumentare produttività',
    icon: 'Zap',
    emoji: '⚡',
    category: 'work',
    description: 'Migliora la tua produttività',
    inputMethod: 'session_detected',
    brainDetectable: true,
    linkedHabit: 'deep_work',
  },
  work_life_balance: {
    key: 'work_life_balance',
    label: 'Bilanciare vita-lavoro',
    icon: 'Scale',
    emoji: '⚖️',
    category: 'work',
    description: 'Trova equilibrio tra lavoro e vita',
    inputMethod: 'session_detected',
    brainDetectable: true,
  },
  project_completion: {
    key: 'project_completion',
    label: 'Completare progetto',
    icon: 'CheckCircle',
    emoji: '✅',
    category: 'work',
    description: 'Porta a termine un progetto importante',
    inputMethod: 'milestone',
    brainDetectable: true,
  },
  skill_development: {
    key: 'skill_development',
    label: 'Sviluppare competenza',
    icon: 'Wrench',
    emoji: '🔧',
    category: 'work',
    description: 'Impara una nuova competenza professionale',
    inputMethod: 'milestone',
    brainDetectable: true,
  },

  // ============= FINANCE - Finanze (6 objectives) =============
  save_money: {
    key: 'save_money',
    label: 'Risparmiare',
    icon: 'PiggyBank',
    emoji: '🐷',
    category: 'finance',
    description: 'Risparmia una somma di denaro',
    inputMethod: 'numeric',
    unit: '€',
    requiresStartingValue: true,
    step: 100,
    min: 0,
    max: 1000000,
    questionTemplate: 'A quanto ammontano i tuoi risparmi ora?',
  },
  pay_debt: {
    key: 'pay_debt',
    label: 'Estinguere debito',
    icon: 'CreditCard',
    emoji: '💳',
    category: 'finance',
    description: 'Elimina un debito',
    inputMethod: 'numeric',
    unit: '€',
    requiresStartingValue: true,
    step: 100,
    questionTemplate: 'Quanto debito ti rimane?',
  },
  emergency_fund: {
    key: 'emergency_fund',
    label: 'Fondo emergenza',
    icon: 'Shield',
    emoji: '🛡️',
    category: 'finance',
    description: 'Costruisci un fondo per le emergenze',
    inputMethod: 'numeric',
    unit: '€',
    defaultTarget: 3000,
    step: 100,
    questionTemplate: 'Quanto hai nel fondo emergenza?',
  },
  investment_goal: {
    key: 'investment_goal',
    label: 'Obiettivo investimento',
    icon: 'LineChart',
    emoji: '📊',
    category: 'finance',
    description: 'Raggiungi un obiettivo di investimento',
    inputMethod: 'numeric',
    unit: '€',
    step: 500,
    questionTemplate: 'Qual è il valore del tuo portafoglio?',
  },
  income_increase: {
    key: 'income_increase',
    label: 'Aumentare entrate',
    icon: 'TrendingUp',
    emoji: '💰',
    category: 'finance',
    description: 'Aumenta le tue entrate mensili',
    inputMethod: 'numeric',
    unit: '€/mese',
    requiresStartingValue: true,
    step: 100,
    questionTemplate: 'Quali sono le tue entrate mensili?',
  },
  spending_reduction: {
    key: 'spending_reduction',
    label: 'Ridurre spese',
    icon: 'TrendingDown',
    emoji: '📉',
    category: 'finance',
    description: 'Riduci le spese mensili',
    inputMethod: 'numeric',
    unit: '€/mese',
    requiresStartingValue: true,
    step: 50,
    questionTemplate: 'Quanto spendi al mese?',
  },

  // ============= RELATIONSHIPS - Relazioni (4 objectives) =============
  find_partner: {
    key: 'find_partner',
    label: 'Trovare partner',
    icon: 'Heart',
    emoji: '❤️',
    category: 'relationships',
    description: 'Trova una relazione significativa',
    inputMethod: 'milestone',
    brainDetectable: true,
  },
  improve_relationship: {
    key: 'improve_relationship',
    label: 'Migliorare relazione',
    icon: 'HeartHandshake',
    emoji: '💑',
    category: 'relationships',
    description: 'Rafforza la tua relazione attuale',
    inputMethod: 'session_detected',
    brainDetectable: true,
  },
  social_connections: {
    key: 'social_connections',
    label: 'Più connessioni sociali',
    icon: 'Users',
    emoji: '👥',
    category: 'relationships',
    description: 'Espandi la tua rete sociale',
    inputMethod: 'counter',
    unit: 'nuove connessioni',
    defaultTarget: 10,
    linkedHabit: 'social_interaction',
    questionTemplate: 'Quante nuove persone hai conosciuto?',
  },
  family_time: {
    key: 'family_time',
    label: 'Più tempo in famiglia',
    icon: 'Home',
    emoji: '🏠',
    category: 'relationships',
    description: 'Trascorri più tempo con la famiglia',
    inputMethod: 'auto_habit',
    linkedHabit: 'quality_time',
    brainDetectable: true,
  },

  // ============= GROWTH - Crescita (4 objectives) =============
  new_hobby: {
    key: 'new_hobby',
    label: 'Iniziare un hobby',
    icon: 'Palette',
    emoji: '🎨',
    category: 'growth',
    description: 'Inizia un nuovo hobby',
    inputMethod: 'milestone',
    linkedHabit: 'hobby',
    brainDetectable: true,
  },
  public_speaking: {
    key: 'public_speaking',
    label: 'Parlare in pubblico',
    icon: 'Mic',
    emoji: '🎤',
    category: 'growth',
    description: 'Supera la paura di parlare in pubblico',
    inputMethod: 'milestone',
    brainDetectable: true,
  },
  creative_project: {
    key: 'creative_project',
    label: 'Progetto creativo',
    icon: 'Lightbulb',
    emoji: '💡',
    category: 'growth',
    description: 'Completa un progetto creativo personale',
    inputMethod: 'milestone',
    linkedHabit: 'creative_time',
    brainDetectable: true,
  },
  personal_brand: {
    key: 'personal_brand',
    label: 'Costruire personal brand',
    icon: 'User',
    emoji: '🌟',
    category: 'growth',
    description: 'Sviluppa il tuo personal brand',
    inputMethod: 'milestone',
    brainDetectable: true,
  },
};

// ============= HELPER FUNCTIONS =============

export function getObjectiveMeta(presetType: string): ObjectiveMeta | undefined {
  return OBJECTIVE_TYPES[presetType];
}

export function getObjectivesByCategory(category: ObjectiveCategory): ObjectiveMeta[] {
  return Object.values(OBJECTIVE_TYPES).filter(o => o.category === category);
}

export function getAllCategories(): { key: ObjectiveCategory; label: string; emoji: string }[] {
  return [
    { key: 'body', label: 'Corpo', emoji: '💪' },
    { key: 'mind', label: 'Mente', emoji: '🧠' },
    { key: 'study', label: 'Studio', emoji: '📚' },
    { key: 'work', label: 'Lavoro', emoji: '💼' },
    { key: 'finance', label: 'Finanze', emoji: '💰' },
    { key: 'relationships', label: 'Relazioni', emoji: '💕' },
    { key: 'growth', label: 'Crescita', emoji: '🌱' },
  ];
}

export function isAutoSyncObjective(inputMethod: ObjectiveInputMethod): boolean {
  return inputMethod === 'auto_body' || inputMethod === 'auto_habit';
}

export function needsManualCheckin(inputMethod: ObjectiveInputMethod): boolean {
  return inputMethod === 'numeric' || inputMethod === 'counter' || inputMethod === 'milestone';
}

export function isAIDetectable(inputMethod: ObjectiveInputMethod): boolean {
  return inputMethod === 'session_detected';
}

// For custom objectives, AI suggests the best input method based on description
export interface CustomObjectiveAnalysis {
  suggestedCategory: ObjectiveCategory;
  suggestedInputMethod: ObjectiveInputMethod;
  suggestedUnit: string | null;
  needsStartingValue: boolean;
  matchingPreset: string | null;
}
