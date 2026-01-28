import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Gem, ChevronRight, Gift } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useRewardPoints } from '@/hooks/useRewardPoints';

const RewardPointsCard: React.FC = () => {
  const navigate = useNavigate();
  const { totalPoints, canRedeemPremium, isLoading } = useRewardPoints();

  const progressToNextRedemption = Math.min((totalPoints / 1000) * 100, 100);
  const pointsToNextRedemption = Math.max(1000 - totalPoints, 0);

  return (
    <Card className="bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 dark:from-violet-950/40 dark:via-purple-950/30 dark:to-fuchsia-950/20 rounded-3xl border border-violet-200/50 dark:border-violet-800/30 shadow-premium overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Gem className="w-4 h-4 text-violet-500" />
            I Tuoi Punti
          </h3>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-violet-600 dark:text-violet-400 hover:bg-violet-100/50 dark:hover:bg-violet-900/30"
            onClick={() => navigate('/plus')}
          >
            Storico
            <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </div>

        <div className="text-center mb-4">
          <div className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-400 bg-clip-text text-transparent">
            {isLoading ? '...' : totalPoints.toLocaleString()}
          </div>
          <div className="text-sm text-muted-foreground mt-1">punti</div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progresso verso 1 mese Plus</span>
            <span>{totalPoints}/1000</span>
          </div>
          <Progress 
            value={progressToNextRedemption} 
            className="h-2 bg-violet-200/50 dark:bg-violet-800/30"
          />
        </div>

        {canRedeemPremium ? (
          <Button
            className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white rounded-2xl shadow-lg"
            onClick={() => navigate('/plus')}
          >
            <Gift className="w-4 h-4 mr-2" />
            Riscatta 1 mese Plus
          </Button>
        ) : (
          <div className="text-center py-2 px-4 bg-violet-100/50 dark:bg-violet-900/20 rounded-xl">
            <span className="text-sm text-violet-700 dark:text-violet-300">
              Ancora <strong>{pointsToNextRedemption}</strong> punti per il prossimo premio
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RewardPointsCard;
