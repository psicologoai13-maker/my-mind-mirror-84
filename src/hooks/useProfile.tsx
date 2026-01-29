import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface UserProfile {
  id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  created_at: string;
  wellness_score: number | null;
  life_areas_scores: Record<string, number> | null;
  long_term_memory?: string[] | null;
  connection_code?: string | null;
  active_dashboard_metrics?: string[] | null;
  onboarding_completed?: boolean;
  onboarding_answers?: Record<string, unknown> | null;
  selected_goals?: string[] | null;
  // AI cache fields
  ai_dashboard_cache?: Record<string, unknown> | null;
  ai_analysis_cache?: Record<string, unknown> | null;
  ai_insights_cache?: Record<string, unknown> | null;
  ai_cache_updated_at?: string | null;
  last_data_change_at?: string | null;
  // Real-time context fields
  location_permission_granted?: boolean | null;
  realtime_context_cache?: Record<string, unknown> | null;
  realtime_context_updated_at?: string | null;
  // Premium & referral fields
  referral_code?: string | null;
  premium_until?: string | null;
  premium_type?: string | null;
  // Settings fields
  notification_settings?: Record<string, unknown> | null;
  appearance_settings?: Record<string, unknown> | null;
  // NEW: Profile 360° - Demographic data
  height?: number | null;
  birth_date?: string | null;
  gender?: string | null;
  therapy_status?: string | null;
}

export const useProfile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading, error, refetch } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as unknown as UserProfile | null;
    },
    enabled: !!user,
  });

  const updateProfile = useMutation({
    mutationFn: async (updates: Partial<UserProfile>) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates as any)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
  });

  return { profile, isLoading, error, updateProfile, refetch };
};
