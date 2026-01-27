import React from 'react';
import { useTimeWeightedMetrics } from '@/hooks/useTimeWeightedMetrics';
import { Hash, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Topic {
  tag: string;
  intensity: number;
}

const FocusTopics: React.FC = () => {
  // 🎯 TIME-WEIGHTED AVERAGE: Use unified data source
  const { emotions, deepPsychology, hasData } = useTimeWeightedMetrics(30, 7);

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
      .slice(0, 6);
  }, [emotions, deepPsychology, hasData]);

  const topicColors = [
    'bg-primary/15 text-primary border-primary/20',
    'bg-accent text-accent-foreground border-accent',
    'bg-secondary text-secondary-foreground border-secondary',
    'bg-muted text-muted-foreground border-muted',
  ];

  // Don't render if no topics
  if (topics.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Focus Title */}
      <div className="flex items-center gap-2 px-1">
        <Hash className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          I Tuoi Focus
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {topics.map((topic, index) => (
          <div
            key={topic.tag}
            className={cn(
              "px-4 py-3 rounded-2xl text-sm font-medium border transition-all duration-300",
              "hover:scale-[1.02] cursor-default",
              "flex items-center justify-between",
              topicColors[index % topicColors.length]
            )}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <span className="capitalize">{topic.tag}</span>
            <span className="text-xs opacity-70 font-semibold">
              {Math.round(topic.intensity)}/10
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FocusTopics;
