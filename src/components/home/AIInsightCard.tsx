import React from 'react';
import { useSessions } from '@/hooks/useSessions';
import { Lightbulb, Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AIInsightCard: React.FC = () => {
  const { journalSessions } = useSessions();
  const navigate = useNavigate();

  // Get latest insight from completed sessions
  const latestInsight = React.useMemo(() => {
    const sessionWithInsight = journalSessions?.find(s => s.insights);
    return sessionWithInsight?.insights || null;
  }, [journalSessions]);

  // Get latest AI summary if no insight
  const latestSummary = React.useMemo(() => {
    if (latestInsight) return null;
    const sessionWithSummary = journalSessions?.find(s => s.ai_summary);
    if (sessionWithSummary?.ai_summary) {
      // Take first 2 sentences
      const sentences = sessionWithSummary.ai_summary.split(/[.!?]+/).filter(Boolean);
      return sentences.slice(0, 2).join('. ') + '.';
    }
    return null;
  }, [journalSessions, latestInsight]);

  const displayText = latestInsight || latestSummary;

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

      {displayText ? (
        <>
          <p className="text-gray-600 text-sm leading-relaxed mb-4">
            "{displayText}"
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
