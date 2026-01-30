import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface UserInterests {
  // Sport
  follows_football: boolean;
  favorite_teams: string[];
  favorite_athletes: string[];
  sports_followed: string[];
  
  // Entertainment
  favorite_genres: string[];
  current_shows: string[];
  favorite_artists: string[];
  music_genres: string[];
  podcasts: string[];
  gaming_interests: string[];
  
  // Work
  industry: string | null;
  role_type: string | null;
  professional_interests: string[];
  career_goals: string[];
  
  // Lifestyle
  pet_owner: boolean;
  pets: Array<{ type: string; name: string }>;
  dietary_preferences: string[];
  personal_values: string[];
  political_interest: boolean;
  religion_spirituality: string | null;
  
  // Hobbies
  creative_hobbies: string[];
  outdoor_activities: string[];
  indoor_activities: string[];
  learning_interests: string[];
  travel_style: string | null;
  dream_destinations: string[];
  
  // Social
  relationship_status: string | null;
  has_children: boolean;
  children_count: number;
  living_situation: string | null;
  social_preference: string | null;
  
  // Communication preferences
  nickname: string | null;
  humor_preference: string | null;
  emoji_preference: string | null;
  response_length: string | null;
  
  // Temporal context
  work_schedule: string | null;
  commute_time: number | null;
  important_dates: Array<{ date: string; description: string }>;
  recurring_events: Array<{ day: string; event: string }>;
  
  // Safety
  sensitive_topics: string[];
  preferred_topics: string[];
  news_sensitivity: string | null;
}

const DEFAULT_INTERESTS: UserInterests = {
  follows_football: false,
  favorite_teams: [],
  favorite_athletes: [],
  sports_followed: [],
  favorite_genres: [],
  current_shows: [],
  favorite_artists: [],
  music_genres: [],
  podcasts: [],
  gaming_interests: [],
  industry: null,
  role_type: null,
  professional_interests: [],
  career_goals: [],
  pet_owner: false,
  pets: [],
  dietary_preferences: [],
  personal_values: [],
  political_interest: false,
  religion_spirituality: null,
  creative_hobbies: [],
  outdoor_activities: [],
  indoor_activities: [],
  learning_interests: [],
  travel_style: null,
  dream_destinations: [],
  relationship_status: null,
  has_children: false,
  children_count: 0,
  living_situation: null,
  social_preference: null,
  nickname: null,
  humor_preference: null,
  emoji_preference: 'moderati',
  response_length: 'normale',
  work_schedule: null,
  commute_time: null,
  important_dates: [],
  recurring_events: [],
  sensitive_topics: [],
  preferred_topics: [],
  news_sensitivity: 'tutto',
};

export const useUserInterests = () => {
  const { user } = useAuth();
  const [interests, setInterests] = useState<UserInterests | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch interests from database
  const fetchInterests = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from('user_interests')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        // Map database fields to our interface
        setInterests({
          follows_football: data.follows_football || false,
          favorite_teams: data.favorite_teams || [],
          favorite_athletes: data.favorite_athletes || [],
          sports_followed: data.sports_followed || [],
          favorite_genres: data.favorite_genres || [],
          current_shows: data.current_shows || [],
          favorite_artists: data.favorite_artists || [],
          music_genres: data.music_genres || [],
          podcasts: data.podcasts || [],
          gaming_interests: data.gaming_interests || [],
          industry: data.industry,
          role_type: data.role_type,
          professional_interests: data.professional_interests || [],
          career_goals: data.career_goals || [],
          pet_owner: data.pet_owner || false,
          pets: (data.pets as any) || [],
          dietary_preferences: data.dietary_preferences || [],
          personal_values: data.personal_values || [],
          political_interest: data.political_interest || false,
          religion_spirituality: data.religion_spirituality,
          creative_hobbies: data.creative_hobbies || [],
          outdoor_activities: data.outdoor_activities || [],
          indoor_activities: data.indoor_activities || [],
          learning_interests: data.learning_interests || [],
          travel_style: data.travel_style,
          dream_destinations: data.dream_destinations || [],
          relationship_status: data.relationship_status,
          has_children: data.has_children || false,
          children_count: data.children_count || 0,
          living_situation: data.living_situation,
          social_preference: data.social_preference,
          nickname: data.nickname,
          humor_preference: data.humor_preference,
          emoji_preference: data.emoji_preference || 'moderati',
          response_length: data.response_length || 'normale',
          work_schedule: data.work_schedule,
          commute_time: data.commute_time,
          important_dates: (data.important_dates as any) || [],
          recurring_events: (data.recurring_events as any) || [],
          sensitive_topics: data.sensitive_topics || [],
          preferred_topics: data.preferred_topics || [],
          news_sensitivity: data.news_sensitivity || 'tutto',
        });
      } else {
        // No data yet, use defaults
        setInterests(DEFAULT_INTERESTS);
      }
    } catch (err) {
      console.error('[useUserInterests] Error:', err);
      setError(err as Error);
      setInterests(DEFAULT_INTERESTS);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Update interests
  const updateInterests = useCallback(async (updates: Partial<UserInterests>) => {
    if (!user?.id) return;

    try {
      const { error: upsertError } = await supabase
        .from('user_interests')
        .upsert({
          user_id: user.id,
          ...updates,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (upsertError) throw upsertError;

      // Update local state
      setInterests(prev => prev ? { ...prev, ...updates } : { ...DEFAULT_INTERESTS, ...updates });
    } catch (err) {
      console.error('[useUserInterests] Update error:', err);
      throw err;
    }
  }, [user?.id]);

  // Generate context block for AI
  const generateContextBlock = useCallback((): string => {
    if (!interests) return '';

    const lines: string[] = [];

    // Sport
    if (interests.sports_followed.length > 0 || interests.favorite_teams.length > 0) {
      lines.push(`SPORT: ${interests.sports_followed.join(', ') || 'Non specificato'}`);
      if (interests.favorite_teams.length > 0) {
        lines.push(`SQUADRE DEL CUORE: ${interests.favorite_teams.join(', ')}`);
      }
      if (interests.favorite_athletes.length > 0) {
        lines.push(`ATLETI: ${interests.favorite_athletes.join(', ')}`);
      }
    }

    // Entertainment
    if (interests.music_genres.length > 0 || interests.current_shows.length > 0) {
      if (interests.music_genres.length > 0) {
        lines.push(`MUSICA: ${interests.music_genres.join(', ')}${interests.favorite_artists.length > 0 ? ` (${interests.favorite_artists.join(', ')})` : ''}`);
      }
      if (interests.current_shows.length > 0) {
        lines.push(`SERIE TV: ${interests.current_shows.join(', ')}`);
      }
    }

    // Work
    if (interests.industry) {
      lines.push(`LAVORO: ${interests.industry}${interests.professional_interests.length > 0 ? ` - Interessi: ${interests.professional_interests.join(', ')}` : ''}`);
    }

    // Hobbies
    const allHobbies = [...interests.creative_hobbies, ...interests.outdoor_activities, ...interests.indoor_activities];
    if (allHobbies.length > 0) {
      lines.push(`HOBBY: ${allHobbies.join(', ')}`);
    }

    // Pets
    if (interests.pet_owner && interests.pets.length > 0) {
      const petNames = interests.pets.map(p => `${p.name} (${p.type})`).join(', ');
      lines.push(`ANIMALI: ${petNames}`);
    } else if (interests.pet_owner) {
      lines.push(`ANIMALI: Sì`);
    }

    // Values
    if (interests.personal_values.length > 0) {
      lines.push(`VALORI: ${interests.personal_values.join(', ')}`);
    }

    // Communication preferences
    const commPrefs: string[] = [];
    if (interests.nickname) commPrefs.push(`Chiamami: ${interests.nickname}`);
    if (interests.humor_preference) commPrefs.push(`Umorismo: ${interests.humor_preference}`);
    if (interests.emoji_preference) commPrefs.push(`Emoji: ${interests.emoji_preference}`);
    if (commPrefs.length > 0) {
      lines.push(`PREFERENZE COMUNICAZIONE: ${commPrefs.join(' | ')}`);
    }

    // Sensitive topics
    if (interests.sensitive_topics.length > 0) {
      lines.push(`⚠️ ARGOMENTI SENSIBILI (evita): ${interests.sensitive_topics.join(', ')}`);
    }

    // News sensitivity
    if (interests.news_sensitivity && interests.news_sensitivity !== 'tutto') {
      lines.push(`NEWS: ${interests.news_sensitivity}`);
    }

    return lines.length > 0 ? lines.join('\n') : '';
  }, [interests]);

  // Initial fetch
  useEffect(() => {
    fetchInterests();
  }, [fetchInterests]);

  return {
    interests,
    isLoading,
    error,
    updateInterests,
    refetch: fetchInterests,
    generateContextBlock,
  };
};
