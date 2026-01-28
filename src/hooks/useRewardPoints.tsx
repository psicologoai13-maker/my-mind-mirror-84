import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface RewardPoints {
  id: string;
  user_id: string;
  total_points: number;
  lifetime_points: number;
  created_at: string;
  updated_at: string;
}

export interface RewardTransaction {
  id: string;
  user_id: string;
  points: number;
  type: string;
  source_id: string | null;
  description: string;
  created_at: string;
}

export const BADGE_POINTS: Record<string, number> = {
  first_checkin: 25,
  week_streak: 100,
  month_streak: 300,
  first_session: 50,
  hundred_checkins: 200,
  hydration_master: 75,
  smoke_free_week: 150,
  smoke_free_month: 400,
  zen_master: 100,
  balanced_life: 250,
};

export const useRewardPoints = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: points, isLoading } = useQuery({
    queryKey: ['reward-points', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_reward_points')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      // Se non esiste, crea record iniziale
      if (!data) {
        const { data: newData, error: insertError } = await supabase
          .from('user_reward_points')
          .insert({ user_id: user.id, total_points: 0, lifetime_points: 0 })
          .select()
          .single();
        
        if (insertError) throw insertError;
        return newData as RewardPoints;
      }
      
      return data as RewardPoints;
    },
    enabled: !!user,
  });

  const { data: transactions } = useQuery({
    queryKey: ['reward-transactions', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('reward_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as RewardTransaction[];
    },
    enabled: !!user,
  });

  const addPoints = useMutation({
    mutationFn: async ({ 
      points: pointsToAdd, 
      type, 
      sourceId, 
      description 
    }: { 
      points: number; 
      type: string; 
      sourceId?: string; 
      description: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Inserisci transazione
      const { error: txError } = await supabase
        .from('reward_transactions')
        .insert({
          user_id: user.id,
          points: pointsToAdd,
          type,
          source_id: sourceId || null,
          description,
        });

      if (txError) throw txError;

      // Aggiorna totale usando RPC
      const { error: rpcError } = await supabase.rpc('add_reward_points', {
        p_user_id: user.id,
        p_points: pointsToAdd,
      });

      if (rpcError) throw rpcError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reward-points', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['reward-transactions', user?.id] });
    },
  });

  const redeemPremium = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      if (!points || points.total_points < 1000) {
        throw new Error('Punti insufficienti');
      }

      // Scala 1000 punti
      const { error: txError } = await supabase
        .from('reward_transactions')
        .insert({
          user_id: user.id,
          points: -1000,
          type: 'premium_redemption',
          description: '1 mese Aria Plus riscattato',
        });

      if (txError) throw txError;

      // Aggiorna totale
      const { error: rpcError } = await supabase.rpc('add_reward_points', {
        p_user_id: user.id,
        p_points: -1000,
      });

      if (rpcError) throw rpcError;

      // Aggiorna premium_until nel profilo
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('premium_until')
        .eq('user_id', user.id)
        .single();

      const currentExpiry = profile?.premium_until ? new Date(profile.premium_until) : new Date();
      const baseDate = new Date(Math.max(currentExpiry.getTime(), Date.now()));
      baseDate.setMonth(baseDate.getMonth() + 1);

      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          premium_until: baseDate.toISOString(),
          premium_type: 'points',
        })
        .eq('user_id', user.id);

      if (profileError) throw profileError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reward-points', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['reward-transactions', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
  });

  return {
    points,
    totalPoints: points?.total_points || 0,
    lifetimePoints: points?.lifetime_points || 0,
    transactions: transactions || [],
    isLoading,
    addPoints,
    redeemPremium,
    canRedeemPremium: (points?.total_points || 0) >= 1000,
  };
};
