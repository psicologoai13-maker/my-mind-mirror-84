import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useProfile } from './useProfile';

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  referral_code: string;
  status: string;
  referred_active_days: number;
  points_awarded: boolean;
  created_at: string;
  completed_at: string | null;
}

export const useReferrals = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  const { data: referrals, isLoading } = useQuery({
    queryKey: ['referrals', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_referrals')
        .select('*')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Referral[];
    },
    enabled: !!user,
  });

  const pendingReferrals = referrals?.filter(r => r.status === 'pending') || [];
  const completedReferrals = referrals?.filter(r => r.status === 'completed') || [];
  const totalEarnedFromReferrals = completedReferrals.length * 400;

  const shareReferralCode = async () => {
    if (!profile?.referral_code) return;

    const shareData = {
      title: 'Unisciti a Aria',
      text: `Usa il mio codice ${profile.referral_code} per iscriverti a Aria e iniziare il tuo percorso di benessere!`,
      url: `https://aria.app/join?ref=${profile.referral_code}`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or error
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(
        `Usa il mio codice ${profile.referral_code} per iscriverti a Aria!`
      );
    }
  };

  const copyReferralCode = async () => {
    if (!profile?.referral_code) return false;
    
    try {
      await navigator.clipboard.writeText(profile.referral_code);
      return true;
    } catch {
      return false;
    }
  };

  return {
    referralCode: profile?.referral_code || null,
    referrals: referrals || [],
    pendingReferrals,
    completedReferrals,
    totalEarnedFromReferrals,
    isLoading,
    shareReferralCode,
    copyReferralCode,
  };
};
