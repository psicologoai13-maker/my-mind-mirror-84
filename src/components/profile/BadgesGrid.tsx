import React, { useState } from 'react';
import { Award, ChevronRight, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAchievements, ACHIEVEMENTS, AchievementDefinition } from '@/hooks/useAchievements';
import { BADGE_POINTS } from '@/hooks/useRewardPoints';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AchievementWithStatus extends AchievementDefinition {
  unlocked: boolean;
  unlockedAt?: string;
  metadata?: Record<string, unknown>;
}

const BadgesGrid: React.FC = () => {
  const { allAchievements, isUnlocked, totalUnlocked, totalAchievements } = useAchievements();
  const [selectedBadge, setSelectedBadge] = useState<AchievementWithStatus | null>(null);
  const [showAll, setShowAll] = useState(false);

  const displayedBadges = showAll ? allAchievements : allAchievements.slice(0, 8);

  return (
    <>
      <Card className="bg-card rounded-3xl border border-border/50 shadow-premium overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              Badge Sbloccati ({totalUnlocked}/{totalAchievements})
            </h3>
            {!showAll && allAchievements.length > 8 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-primary hover:bg-primary/10"
                onClick={() => setShowAll(true)}
              >
                Vedi tutti
                <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            )}
          </div>

          <div className="grid grid-cols-4 gap-3">
            {displayedBadges.map((badge) => {
              const unlocked = badge.unlocked;
              return (
                <button
                  key={badge.id}
                  onClick={() => setSelectedBadge(badge)}
                  className={`
                    aspect-square rounded-2xl flex flex-col items-center justify-center p-2 transition-all
                    ${unlocked 
                      ? 'bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/30 shadow-sm hover:scale-105' 
                      : 'bg-muted/30 opacity-50'
                    }
                  `}
                >
                  <span className="text-2xl">{badge.icon}</span>
                  {!unlocked && (
                    <Lock className="w-3 h-3 text-muted-foreground mt-1" />
                  )}
                </button>
              );
            })}
          </div>

          {showAll && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-4 text-xs text-muted-foreground"
              onClick={() => setShowAll(false)}
            >
              Mostra meno
            </Button>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedBadge} onOpenChange={() => setSelectedBadge(null)}>
        <DialogContent className="rounded-3xl max-w-[340px]">
          {selectedBadge && (
            <>
              <DialogHeader>
                <div className="flex flex-col items-center text-center">
                  <div className={`
                    w-20 h-20 rounded-3xl flex items-center justify-center mb-4
                    ${selectedBadge.unlocked
                      ? 'bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/30'
                      : 'bg-muted/30'
                    }
                  `}>
                    <span className="text-5xl">{selectedBadge.icon}</span>
                  </div>
                  <DialogTitle className="text-xl font-semibold">
                    {selectedBadge.title}
                  </DialogTitle>
                </div>
              </DialogHeader>

              <div className="text-center space-y-4">
                <p className="text-muted-foreground text-sm">
                  {selectedBadge.description}
                </p>

                {BADGE_POINTS[selectedBadge.id] && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-100 dark:bg-violet-900/30 rounded-full">
                    <span className="text-violet-600 dark:text-violet-400 font-semibold">
                      +{BADGE_POINTS[selectedBadge.id]} punti
                    </span>
                  </div>
                )}

                {selectedBadge.unlocked ? (
                  <div className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-100 dark:bg-emerald-900/20 rounded-xl">
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      ✓ Sbloccato
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 py-3 px-4 bg-muted/50 rounded-xl">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground text-sm">
                      Non ancora sbloccato
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BadgesGrid;
