import React from 'react';
import { useTimeWeightedMetrics } from '@/hooks/useTimeWeightedMetrics';
import { Lightbulb, Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AIInsightCard: React.FC = () => {
  const { vitals, deepPsychology, hasData } = useTimeWeightedMetrics(30, 7);
  const navigate = useNavigate();

  // Generate AI insight based on time-weighted metrics
  const insightText = React.useMemo(() => {
    if (!hasData) return null;

    const insights: string[] = [];

    // Analyze vitals
    if (vitals.mood !== null && vitals.mood >= 7) {
      insights.push("Il tuo umore è stato positivo ultimamente, continua così!");
    } else if (vitals.mood !== null && vitals.mood <= 4) {
      insights.push("Ho notato che il tuo umore è basso. Vuoi parlarne?");
    }

    if (vitals.anxiety !== null && vitals.anxiety >= 7) {
      insights.push("L'ansia sembra alta. Prova tecniche di respirazione profonda.");
    } else if (vitals.anxiety !== null && vitals.anxiety <= 3) {
      insights.push("I tuoi livelli di ansia sono bassi, ottimo lavoro!");
    }

    if (vitals.sleep !== null && vitals.sleep <= 4) {
      insights.push("La qualità del sonno potrebbe migliorare. Considera una routine serale.");
    }

    // Analyze deep psychology
    if (deepPsychology.rumination !== null && deepPsychology.rumination >= 7) {
      insights.push("Stai ruminando molto. Prova a scrivere i tuoi pensieri per liberartene.");
    }

    if (deepPsychology.gratitude !== null && deepPsychology.gratitude >= 7) {
      insights.push("La tua gratitudine è alta - questo protegge la salute mentale!");
    }

    if (deepPsychology.burnout_level !== null && deepPsychology.burnout_level >= 7) {
      insights.push("Attenzione al burnout. Prenditi del tempo per te stesso.");
    }

    // Return most relevant insight
    return insights.length > 0 ? insights[0] : "Parla con me per ricevere insight personalizzati.";
  }, [vitals, deepPsychology, hasData]);

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 rounded-xl bg-primary/10">
          <Lightbulb className="w-4 h-4 text-primary" />
        </div>
        <h3 className="font-semibold text-gray-900">
          Il consiglio dell'AI
        </h3>
      </div>

      {insightText ? (
        <>
          <p className="text-gray-600 text-sm leading-relaxed mb-4">
            "{insightText}"
          </p>
          <button 
            onClick={() => navigate('/sessions')}
            className="flex items-center gap-1 text-xs text-primary font-medium hover:gap-2 transition-all"
          >
            Vedi tutti i tuoi insight
            <ArrowRight className="w-3 h-3" />
          </button>
        </>
      ) : (
        <div className="flex items-center gap-3 py-2">
          <div className="p-3 rounded-full bg-gray-50">
            <Sparkles className="w-5 h-5 text-primary animate-pulse-soft" />
          </div>
          <div>
            <p className="text-sm text-gray-900 font-medium">
              Pronto ad ascoltarti
            </p>
            <p className="text-xs text-gray-500">
              Dopo una sessione, riceverai un consiglio personalizzato
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIInsightCard;
