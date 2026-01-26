import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export type ObjectiveCategory = 'mind' | 'body' | 'study' | 'work' | 'relationships' | 'growth' | 'finance';
export type ObjectiveStatus = 'active' | 'achieved' | 'paused' | 'abandoned';

export interface Objective {
  id: string;
  user_id: string;
  category: ObjectiveCategory;
  title: string;
  description?: string;
  target_value?: number;
  current_value?: number;
  unit?: string;
  deadline?: string;
  status: ObjectiveStatus;
  ai_feedback?: string;
  progress_history: Array<{ date: string; value: number; note?: string }>;
  created_at: string;
  updated_at: string;
}

export interface CreateObjectiveInput {
  category: ObjectiveCategory;
  title: string;
  description?: string;
  target_value?: number;
  unit?: string;
  deadline?: string;
}

export interface UpdateObjectiveInput {
  id: string;
  current_value?: number;
  status?: ObjectiveStatus;
  ai_feedback?: string;
  title?: string;
  description?: string;
  target_value?: number;
  deadline?: string;
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
      return data as Objective[];
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
          current_value: 0,
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
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
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
