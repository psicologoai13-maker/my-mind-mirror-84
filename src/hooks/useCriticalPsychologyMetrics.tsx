import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format, subDays } from 'date-fns';

export interface CriticalMetric {
  key: string;
  label: string;
  icon: string;
  question: string;
  category: 'cognitive' | 'stress' | 'physiological' | 'emotional';
  value: number | null;
  isCritical: boolean;
  isMissing: boolean;
  daysSinceLastData: number;
}

// All deep psychology metrics with their questions
const PSYCHOLOGY_METRICS_CONFIG: Record<string, Omit<CriticalMetric, 'value' | 'isCritical' | 'isMissing' | 'daysSinceLastData'>> = {
  rumination: {
    key: 'rumination',
    label: 'Ruminazione',
    icon: '🔄',
    question: 'Quanto stai ripensando al passato oggi?',
    category: 'cognitive',
  },
  self_efficacy: {
    key: 'self_efficacy',
    label: 'Autoefficacia',
    icon: '💪',
    question: 'Quanto ti senti capace di affrontare le sfide?',
    category: 'cognitive',
  },
  mental_clarity: {
    key: 'mental_clarity',
    label: 'Lucidità Mentale',
    icon: '🧠',
    question: 'Quanto ti senti lucido mentalmente oggi?',
    category: 'cognitive',
  },
  burnout_level: {
    key: 'burnout_level',
    label: 'Burnout',
    icon: '🔥',
    question: 'Quanto ti senti esaurito o logorato?',
    category: 'stress',
  },
  coping_ability: {
    key: 'coping_ability',
    label: 'Resilienza',
    icon: '🛡️',
    question: 'Quanto riesci a gestire lo stress oggi?',
    category: 'stress',
  },
  loneliness_perceived: {
    key: 'loneliness_perceived',
    label: 'Solitudine',
    icon: '🌑',
    question: 'Quanto ti senti solo, anche in compagnia?',
    category: 'stress',
  },
  somatic_tension: {
    key: 'somatic_tension',
    label: 'Tensione Fisica',
    icon: '😣',
    question: 'Noti tensione fisica (collo, schiena, stomaco)?',
    category: 'physiological',
  },
  appetite_changes: {
    key: 'appetite_changes',
    label: 'Appetito',
    icon: '🍽️',
    question: 'Come è stato il tuo appetito oggi?',
    category: 'physiological',
  },
  sunlight_exposure: {
    key: 'sunlight_exposure',
    label: 'Luce Solare',
    icon: '☀️',
    question: 'Quanto tempo hai passato all\'aperto oggi?',
    category: 'physiological',
  },
  guilt: {
    key: 'guilt',
    label: 'Senso di Colpa',
    icon: '😔',
    question: 'Ti sei sentito in colpa per qualcosa oggi?',
    category: 'emotional',
  },
  gratitude: {
    key: 'gratitude',
    label: 'Gratitudine',
    icon: '🙏',
    question: 'Per cosa sei grato oggi?',
    category: 'emotional',
  },
  irritability: {
    key: 'irritability',
    label: 'Irritabilità',
    icon: '😤',
    question: 'Quanto facilmente ti sei innervosito oggi?',
    category: 'emotional',
  },
};

// Critical thresholds - metrics are critical if above these values
const CRITICAL_THRESHOLDS: Record<string, number> = {
  rumination: 7,
  burnout_level: 7,
  loneliness_perceived: 7,
  somatic_tension: 7,
  guilt: 7,
  irritability: 7,
  appetite_changes: 7,
  // Inverted metrics - critical if BELOW these values
  self_efficacy: 4, // Critical if LOW
  mental_clarity: 4,
  coping_ability: 4,
  gratitude: 4,
  sunlight_exposure: 4,
};

const INVERTED_METRICS = ['self_efficacy', 'mental_clarity', 'coping_ability', 'gratitude', 'sunlight_exposure'];

interface PsychologyData {
  date: string;
  rumination: number | null;
  self_efficacy: number | null;
  mental_clarity: number | null;
  burnout_level: number | null;
  coping_ability: number | null;
  loneliness_perceived: number | null;
  somatic_tension: number | null;
  appetite_changes: number | null;
  sunlight_exposure: number | null;
  guilt: number | null;
  gratitude: number | null;
  irritability: number | null;
}

/**
 * Hook to get critical and missing psychology metrics for smart check-in rotation
 */
export const useCriticalPsychologyMetrics = () => {
  const { user } = useAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['critical-psychology-metrics', user?.id],
    queryFn: async (): Promise<{
      criticalMetrics: CriticalMetric[];
      missingMetrics: CriticalMetric[];
      prioritizedSlots: CriticalMetric[];
    }> => {
      if (!user) {
        return { criticalMetrics: [], missingMetrics: [], prioritizedSlots: [] };
      }

      // Fetch last 3 days of psychology data
      const threeDaysAgo = format(subDays(new Date(), 3), 'yyyy-MM-dd');
      const today = format(new Date(), 'yyyy-MM-dd');

      const { data: psychologyData, error } = await supabase
        .from('daily_psychology')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', threeDaysAgo)
        .lte('date', today)
        .order('date', { ascending: false });

      if (error) {
        console.error('[useCriticalPsychologyMetrics] Error:', error);
        return { criticalMetrics: [], missingMetrics: [], prioritizedSlots: [] };
      }

      const dataByDate = (psychologyData || []) as PsychologyData[];
      const todayData = dataByDate.find(d => d.date === today);
      
      // Analyze each metric
      const criticalMetrics: CriticalMetric[] = [];
      const missingMetrics: CriticalMetric[] = [];

      Object.entries(PSYCHOLOGY_METRICS_CONFIG).forEach(([key, config]) => {
        const todayValue = todayData?.[key as keyof PsychologyData] as number | null;
        
        // Find the most recent non-null value
        let lastValue: number | null = null;
        let daysSinceLastData = -1;
        
        for (let i = 0; i < dataByDate.length; i++) {
          const val = dataByDate[i][key as keyof PsychologyData] as number | null;
          if (val !== null) {
            lastValue = val;
            const daysDiff = Math.floor(
              (new Date().getTime() - new Date(dataByDate[i].date).getTime()) / (1000 * 60 * 60 * 24)
            );
            daysSinceLastData = daysDiff;
            break;
          }
        }

        // Determine if critical
        const threshold = CRITICAL_THRESHOLDS[key];
        const isInverted = INVERTED_METRICS.includes(key);
        let isCritical = false;

        if (lastValue !== null && threshold !== undefined) {
          if (isInverted) {
            isCritical = lastValue <= threshold; // Critical if LOW
          } else {
            isCritical = lastValue >= threshold; // Critical if HIGH
          }
        }

        const isMissing = todayValue === null;

        const metric: CriticalMetric = {
          ...config,
          value: lastValue,
          isCritical,
          isMissing,
          daysSinceLastData: daysSinceLastData === -1 ? 999 : daysSinceLastData,
        };

        if (isCritical) {
          criticalMetrics.push(metric);
        }

        if (isMissing) {
          missingMetrics.push(metric);
        }
      });

      // Sort critical by value intensity
      criticalMetrics.sort((a, b) => {
        const aIntensity = a.value ? (INVERTED_METRICS.includes(a.key) ? 10 - a.value : a.value) : 0;
        const bIntensity = b.value ? (INVERTED_METRICS.includes(b.key) ? 10 - b.value : b.value) : 0;
        return bIntensity - aIntensity;
      });

      // Sort missing by days since last data (oldest first)
      missingMetrics.sort((a, b) => b.daysSinceLastData - a.daysSinceLastData);

      // Build prioritized slots: 
      // 1. Critical metrics first (max 2)
      // 2. Then missing metrics by age (fill remaining slots)
      const prioritizedSlots: CriticalMetric[] = [];
      
      // Add critical metrics (max 2)
      criticalMetrics.slice(0, 2).forEach(m => {
        if (!prioritizedSlots.find(p => p.key === m.key)) {
          prioritizedSlots.push(m);
        }
      });

      // Fill with missing metrics
      missingMetrics.forEach(m => {
        if (prioritizedSlots.length < 4 && !prioritizedSlots.find(p => p.key === m.key)) {
          prioritizedSlots.push(m);
        }
      });

      return { criticalMetrics, missingMetrics, prioritizedSlots };
    },
    enabled: !!user,
    staleTime: 60 * 1000, // 1 minute
  });

  return {
    criticalMetrics: data?.criticalMetrics || [],
    missingMetrics: data?.missingMetrics || [],
    prioritizedSlots: data?.prioritizedSlots || [],
    isLoading,
    refetch,
  };
};

/**
 * Get investigative questions for AI chat based on missing critical metrics
 */
export const getInvestigativeQuestions = (
  missingMetrics: CriticalMetric[],
  criticalMetrics: CriticalMetric[]
): string[] => {
  const questions: string[] = [];

  // Add critical metric follow-ups
  criticalMetrics.slice(0, 2).forEach(m => {
    switch (m.key) {
      case 'rumination':
        questions.push('Noto che ultimamente hai avuto molti pensieri ricorrenti. C\'è qualcosa in particolare che continua a tornarti in mente?');
        break;
      case 'burnout_level':
        questions.push('Mi sembra che tu sia molto stanco ultimamente. Come ti stai prendendo cura di te stesso?');
        break;
      case 'loneliness_perceived':
        questions.push('A volte anche in mezzo agli altri possiamo sentirci soli. Ti è capitato di recente?');
        break;
      case 'somatic_tension':
        questions.push('Mentre mi racconti questo, noti qualche tensione fisica particolare, come spalle rigide o mal di testa?');
        break;
      case 'guilt':
        questions.push('Sento che potresti portarti dietro un po\' di senso di colpa. Vuoi parlarne?');
        break;
    }
  });

  // Add missing metric explorations
  missingMetrics.slice(0, 2).forEach(m => {
    if (m.daysSinceLastData > 2) {
      switch (m.key) {
        case 'gratitude':
          questions.push('C\'è qualcosa per cui ti senti grato oggi, anche piccola?');
          break;
        case 'sunlight_exposure':
          questions.push('Sei riuscito a passare un po\' di tempo all\'aria aperta di recente?');
          break;
        case 'self_efficacy':
          questions.push('Come ti senti rispetto alla tua capacità di affrontare le sfide in questo periodo?');
          break;
        case 'appetite_changes':
          questions.push('Come è stato il tuo appetito ultimamente? A volte lo stress può influenzarlo.');
          break;
      }
    }
  });

  return questions.slice(0, 3); // Max 3 questions
};
