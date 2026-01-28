import React from 'react';
import { useAchievements, ACHIEVEMENTS } from '@/hooks/useAchievements';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const ProfileBadgesRow: React.FC = () => {
  const { unlockedAchievements } = useAchievements();

  // Get only unlocked badges
  const unlockedBadges = unlockedAchievements
    .map(ua => ACHIEVEMENTS[ua.achievement_id])
    .filter(Boolean)
    .slice(0, 8); // Show max 8 badges

  if (unlockedBadges.length === 0) return null;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1.5 flex-wrap">
        {unlockedBadges.map((badge, index) => (
          <Tooltip key={badge.id}>
            <TooltipTrigger asChild>
              <div 
                className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/30 flex items-center justify-center shadow-sm border border-amber-200/50 dark:border-amber-700/30 cursor-pointer hover:scale-110 transition-transform"
              >
                <span className="text-base">{badge.icon}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-card border shadow-lg">
              <p className="font-medium">{badge.title}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
};

export default ProfileBadgesRow;
