import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type DiaryTheme = 'love' | 'work' | 'relationships' | 'self';

export interface DiaryMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ThematicDiary {
  id: string;
  user_id: string;
  theme: DiaryTheme;
  messages: DiaryMessage[];
  last_message_preview: string | null;
  last_updated_at: string;
  created_at: string;
}

export const DIARY_THEMES: { 
  theme: DiaryTheme; 
  label: string; 
  emoji: string; 
  color: string;
}[] = [
  { 
    theme: 'love', 
    label: 'Amore', 
    emoji: '❤️', 
    color: 'text-rose-500',
  },
  { 
    theme: 'work', 
    label: 'Lavoro', 
    emoji: '💼', 
    color: 'text-blue-500',
  },
  { 
    theme: 'relationships', 
    label: 'Relazioni', 
    emoji: '🤝', 
    color: 'text-amber-500',
  },
  { 
    theme: 'self', 
    label: 'Me Stesso', 
    emoji: '🌱', 
    color: 'text-emerald-500',
  },
];

export const useThematicDiaries = () => {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();

  const { data: diaries, isLoading } = useQuery({
    queryKey: ['thematic-diaries', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('thematic_diaries')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      return (data || []).map(d => ({
        ...d,
        messages: (Array.isArray(d.messages) ? d.messages : []) as unknown as DiaryMessage[],
      })) as ThematicDiary[];
    },
    enabled: !!user,
  });

  const getDiary = (theme: DiaryTheme): ThematicDiary | undefined => {
    return diaries?.find(d => d.theme === theme);
  };

  const sendMessage = useMutation({
    mutationFn: async ({ 
      theme, 
      message 
    }: { 
      theme: DiaryTheme; 
      message: string;
    }) => {
      if (!user || !session) throw new Error('Not authenticated');

      const existingDiary = getDiary(theme);
      const newUserMessage: DiaryMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      };

      // Get AI response
      const themeConfig = DIARY_THEMES.find(t => t.theme === theme);
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/thematic-diary-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            theme,
            themeLabel: themeConfig?.label || theme,
            message,
            history: existingDiary?.messages || [],
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI error: ${errorText}`);
      }

      const { reply, memoryUpdate } = await response.json();

      const newAiMessage: DiaryMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: reply,
        timestamp: new Date().toISOString(),
      };

      const updatedMessages = [
        ...(existingDiary?.messages || []),
        newUserMessage,
        newAiMessage,
      ];

      const preview = message.slice(0, 100);

      if (existingDiary) {
        // Update existing diary
        const { error } = await supabase
          .from('thematic_diaries')
          .update({
            messages: updatedMessages as unknown as any,
            last_message_preview: preview,
            last_updated_at: new Date().toISOString(),
          })
          .eq('id', existingDiary.id);

        if (error) throw error;
      } else {
        // Create new diary
        const { error } = await supabase
          .from('thematic_diaries')
          .insert({
            user_id: user.id,
            theme,
            messages: updatedMessages as unknown as any,
            last_message_preview: preview,
          });

        if (error) throw error;
      }

      return { userMessage: newUserMessage, aiMessage: newAiMessage };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['thematic-diaries', user?.id] });
      // Invalidate all related data for instant sync
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['daily-metrics', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['sessions', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['daily-life-areas', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['daily-emotions', user?.id] });
      // CRITICAL: Invalidate the time-weighted life areas for instant dashboard update
      queryClient.invalidateQueries({ queryKey: ['life-areas-weighted', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['daily-metrics-range', user?.id] });
    },
  });

  return {
    diaries,
    getDiary,
    sendMessage,
    isLoading,
    themes: DIARY_THEMES,
  };
};
