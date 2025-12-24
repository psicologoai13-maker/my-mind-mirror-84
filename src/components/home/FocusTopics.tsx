import React from 'react';
import { useSessions } from '@/hooks/useSessions';
import { Hash, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const FocusTopics: React.FC = () => {
  const { journalSessions } = useSessions();

  // Extract emotion tags from recent sessions
  const topics = React.useMemo(() => {
    const tagCounts: Record<string, number> = {};
    
    journalSessions?.slice(0, 10).forEach(session => {
      session.emotion_tags?.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([tag, count]) => ({ tag, count }));
  }, [journalSessions]);

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
              {topic.count > 1 && (
                <span className="ml-1 text-xs opacity-70">×{topic.count}</span>
              )}
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
