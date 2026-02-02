import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { ObjectiveInputMethod, ObjectiveCategory } from '@/lib/objectiveTypes';

export type { ObjectiveCategory } from '@/lib/objectiveTypes';
export type ObjectiveStatus = 'active' | 'achieved' | 'paused' | 'abandoned';

export type FinanceTrackingType = 'accumulation' | 'periodic_saving' | 'spending_limit' | 'periodic_income' | 'debt_reduction';
export type TrackingPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'one_time';

export type CheckinVisibility = 'permanent' | 'daily' | 'hidden';

export interface AIMilestone {
  milestone: string;
  achieved_at: string;
  note?: string;
}

export interface Objective {
  id: string;
  user_id: string;
  category: ObjectiveCategory;
  title: string;
  description?: string;
  target_value?: number;
  current_value?: number;
  starting_value?: number;
  unit?: string;
  deadline?: string;
  status: ObjectiveStatus;
  ai_feedback?: string;
  progress_history: Array<{ date: string; value: number; note?: string }>;
  created_at: string;
  updated_at: string;
  // Sync fields
  input_method?: ObjectiveInputMethod;
  linked_habit?: string;
  linked_body_metric?: string;
  preset_type?: string;
  auto_sync_enabled?: boolean;
  last_auto_sync_at?: string;
  progress_source?: 'habit' | 'session' | 'checkin' | 'manual';
  // Finance-specific fields
  finance_tracking_type?: FinanceTrackingType;
  tracking_period?: TrackingPeriod;
  needs_clarification?: boolean;
  clarification_asked_at?: string;
  // Check-in visibility setting
  checkin_visibility?: CheckinVisibility;
  // AI-managed fields for milestone/qualitative objectives
  ai_custom_description?: string;  // AI-generated description with user-specific details
  ai_progress_estimate?: number;    // AI-estimated progress 0-100 for milestone objectives
  ai_milestones?: AIMilestone[];    // Array of detected milestones
}

// Helper to calculate true progress considering starting point
// Handles both increasing (gain weight, save money) and decreasing (lose weight, smoke less) goals
export function calculateProgress(objective: Objective): number {
  const current = objective.current_value ?? 0;
  const target = objective.target_value;
  const start = objective.starting_value;

  if (target === null || target === undefined) return 0;
  
  // If starting_value is defined, it's a transformation goal (from X to Y)
  // This works for BOTH increasing AND decreasing goals:
  // - Increasing: start=60kg, target=70kg, current=65kg → 50%
  // - Decreasing: start=5 cigarettes, target=2, current=3 → 66.7%
  if (start !== null && start !== undefined) {
    const totalDistance = target - start; // Can be positive (increasing) or negative (decreasing)
    
    if (totalDistance === 0) {
      // Edge case: start equals target
      return current === target ? 100 : 0;
    }
    
    const progressDistance = current - start;
    const progress = (progressDistance / totalDistance) * 100;
    
    // Clamp between 0 and 100
    return Math.min(100, Math.max(0, progress));
  }
  
  // Counter/milestone objectives without starting_value: simple ratio (current / target)
  // E.g., "5 ragazze" where current=1 target=5 → 20%
  return Math.min(100, Math.max(0, (current / target) * 100));
}

export interface CreateObjectiveInput {
  category: ObjectiveCategory;
  title: string;
  description?: string;
  target_value?: number;
  starting_value?: number;
  current_value?: number;
  unit?: string;
  deadline?: string;
  // New sync fields
  input_method?: ObjectiveInputMethod;
  linked_habit?: string;
  linked_body_metric?: string;
  preset_type?: string;
  auto_sync_enabled?: boolean;
  objective_type?: 'counter' | 'transformation' | 'milestone';
}

export interface UpdateObjectiveInput {
  id: string;
  current_value?: number;
  status?: ObjectiveStatus;
  ai_feedback?: string | null;
  title?: string;
  description?: string;
  target_value?: number;
  deadline?: string;
  starting_value?: number;
  // Finance-specific fields
  finance_tracking_type?: FinanceTrackingType;
  tracking_period?: TrackingPeriod;
  needs_clarification?: boolean;
  // Check-in visibility
  checkin_visibility?: CheckinVisibility;
}

export const CATEGORY_CONFIG: Record<ObjectiveCategory, { label: string; emoji: string; color: string }> = {
  mind: { label: 'Mente', emoji: '🧠', color: 'bg-purple-100 text-purple-700' },
  body: { label: 'Corpo', emoji: '💪', color: 'bg-orange-100 text-orange-700' },
  study: { label: 'Studio', emoji: '📚', color: 'bg-blue-100 text-blue-700' },
  work: { label: 'Lavoro', emoji: '💼', color: 'bg-slate-100 text-slate-700' },
  relationships: { label: 'Relazioni', emoji: '💕', color: 'bg-pink-100 text-pink-700' },
  growth: { label: 'Crescita', emoji: '🌱', color: 'bg-emerald-100 text-emerald-700' },
  finance: { label: 'Finanze', emoji: '💰', color: 'bg-yellow-100 text-yellow-700' },
};

export const useObjectives = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: objectives = [], isLoading, error } = useQuery({
    queryKey: ['objectives', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_objectives')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      // Map JSON fields to proper types
      return (data || []).map(obj => ({
        ...obj,
        progress_history: Array.isArray(obj.progress_history) 
          ? obj.progress_history as Array<{ date: string; value: number; note?: string }>
          : [],
        ai_milestones: Array.isArray(obj.ai_milestones)
          ? (obj.ai_milestones as unknown as AIMilestone[])
          : [],
      })) as Objective[];
    },
    enabled: !!user?.id,
  });

  const activeObjectives = objectives.filter(o => o.status === 'active');
  const achievedObjectives = objectives.filter(o => o.status === 'achieved');
  const pausedObjectives = objectives.filter(o => o.status === 'paused');

  const createObjective = useMutation({
    mutationFn: async (input: CreateObjectiveInput) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('user_objectives')
        .insert({
          user_id: user.id,
          ...input,
          current_value: input.current_value ?? input.starting_value ?? 0,
          status: 'active',
          progress_history: [],
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
      toast({
        title: "Obiettivo creato! 🎯",
        description: "Il tuo nuovo obiettivo è stato aggiunto.",
      });
    },
    onError: (error) => {
      console.error('Error creating objective:', error);
      toast({
        title: "Errore",
        description: "Impossibile creare l'obiettivo.",
        variant: "destructive",
      });
    },
  });

  const updateObjective = useMutation({
    mutationFn: async ({ id, ...updates }: UpdateObjectiveInput) => {
      const { data, error } = await supabase
        .from('user_objectives')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return { data, updatedFields: updates };
    },
    onSuccess: async (result) => {
      const { data, updatedFields } = result;
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
      
      // Se è stata modificata la visibilità, invalida la cache check-in
      if ('checkin_visibility' in updatedFields && user?.id) {
        try {
          await supabase
            .from('user_profiles')
            .update({ ai_checkins_cache: null })
            .eq('user_id', user.id);
          
          // Refresh anche i check-in
          queryClient.invalidateQueries({ queryKey: ['smart-checkins'] });
        } catch (e) {
          console.error('Error invalidating checkins cache:', e);
        }
      }
      
      if (data.status === 'achieved') {
        toast({
          title: "Obiettivo raggiunto! 🎉",
          description: `Complimenti per "${data.title}"!`,
        });
      }
    },
    onError: (error) => {
      console.error('Error updating objective:', error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare l'obiettivo.",
        variant: "destructive",
      });
    },
  });

  const deleteObjective = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('user_objectives')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
      toast({
        title: "Obiettivo rimosso",
        description: "L'obiettivo è stato eliminato.",
      });
    },
    onError: (error) => {
      console.error('Error deleting objective:', error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare l'obiettivo.",
        variant: "destructive",
      });
    },
  });

  const addProgress = useMutation({
    mutationFn: async ({ id, value, note }: { id: string; value: number; note?: string }) => {
      const objective = objectives.find(o => o.id === id);
      if (!objective) throw new Error('Objective not found');

      const newHistory = [
        ...objective.progress_history,
        { date: new Date().toISOString(), value, note }
      ];

      const { data, error } = await supabase
        .from('user_objectives')
        .update({
          current_value: value,
          progress_history: newHistory,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
      toast({
        title: "Progresso registrato! 📈",
        description: "Continua così!",
      });
    },
  });

  return {
    objectives,
    activeObjectives,
    achievedObjectives,
    pausedObjectives,
    isLoading,
    error,
    createObjective,
    updateObjective,
    deleteObjective,
    addProgress,
  };
};
