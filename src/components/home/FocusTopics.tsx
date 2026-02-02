import React from 'react';
import { useTimeWeightedMetrics } from '@/hooks/useTimeWeightedMetrics';
import { Hash, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Topic {
  tag: string;
  intensity: number;
}

const FocusTopics: React.FC = () => {
  // 🎯 TIME-WEIGHTED AVERAGE: Use unified data source (30 giorni, half-life 10 giorni)
  const { emotions, deepPsychology, hasData } = useTimeWeightedMetrics(30, 10);

  // Generate topics from time-weighted emotional data
  const topics = React.useMemo<Topic[]>(() => {
    if (!hasData) return [];
    
    const topicList: Topic[] = [];

    // Add emotions as topics
    if (emotions.joy !== null && emotions.joy > 0) {
      topicList.push({ tag: 'gioia', intensity: emotions.joy });
    }
    if (emotions.sadness !== null && emotions.sadness > 0) {
      topicList.push({ tag: 'tristezza', intensity: emotions.sadness });
    }
    if (emotions.anger !== null && emotions.anger > 0) {
      topicList.push({ tag: 'rabbia', intensity: emotions.anger });
    }
    if (emotions.fear !== null && emotions.fear > 0) {
      topicList.push({ tag: 'paura', intensity: emotions.fear });
    }
    if (emotions.apathy !== null && emotions.apathy > 0) {
      topicList.push({ tag: 'apatia', intensity: emotions.apathy });
    }

    // Add psychology topics
    if (deepPsychology.rumination !== null && deepPsychology.rumination >= 5) {
      topicList.push({ tag: 'ruminazione', intensity: deepPsychology.rumination });
    }
    if (deepPsychology.burnout_level !== null && deepPsychology.burnout_level >= 5) {
      topicList.push({ tag: 'stress', intensity: deepPsychology.burnout_level });
    }
    if (deepPsychology.gratitude !== null && deepPsychology.gratitude >= 5) {
      topicList.push({ tag: 'gratitudine', intensity: deepPsychology.gratitude });
    }
    if (deepPsychology.loneliness_perceived !== null && deepPsychology.loneliness_perceived >= 5) {
      topicList.push({ tag: 'solitudine', intensity: deepPsychology.loneliness_perceived });
    }

    return topicList
      .sort((a, b) => b.intensity - a.intensity)
      .slice(0, 4);
  }, [emotions, deepPsychology, hasData]);

  const topicColors = [
    'bg-primary/15 text-primary border-primary/20',
    'bg-accent text-accent-foreground border-accent',
    'bg-secondary text-secondary-foreground border-secondary',
    'bg-muted text-muted-foreground border-muted',
  ];

  return (
    <div className="bg-card/80 backdrop-blur-xl rounded-3xl p-5 shadow-soft border border-border/50 h-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-xl bg-accent">
          <Hash className="w-4 h-4 text-accent-foreground" />
        </div>
        <h3 className="font-display font-semibold text-foreground">
          I tuoi Focus
        </h3>
      </div>

      {topics.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {topics.map((topic, index) => (
            <div
              key={topic.tag}
              className={cn(
                "px-3 py-2 rounded-full text-sm font-medium border transition-all duration-300",
                "hover:scale-105 cursor-default",
                topicColors[index % topicColors.length]
              )}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <span className="capitalize">{topic.tag}</span>
              <span className="ml-1 text-xs opacity-70">
                {Math.round(topic.intensity)}/10
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-20 text-center">
          <Sparkles className="w-6 h-6 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">
            Inizia a parlare per<br />scoprire i tuoi temi
          </p>
        </div>
      )}
    </div>
  );
};

export default FocusTopics;
