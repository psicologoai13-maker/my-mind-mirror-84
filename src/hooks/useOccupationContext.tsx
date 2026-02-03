import { useMemo } from 'react';
import { useProfile } from './useProfile';

export type OccupationType = 'student' | 'worker' | 'both';

export interface LifeAreaConfig {
  key: string;
  label: string;
  icon: string;
  colorClass: string;
  dbField: string; // field name in daily_life_areas
}

// Base life areas (always shown)
const BASE_LIFE_AREAS: LifeAreaConfig[] = [
  { key: 'love', label: 'Amore', icon: '❤️', colorClass: 'bg-rose-500', dbField: 'love' },
  { key: 'social', label: 'Socialità', icon: '🤝', colorClass: 'bg-sky-500', dbField: 'social' },
  { key: 'health', label: 'Salute', icon: '🧘', colorClass: 'bg-emerald-500', dbField: 'health' },
  { key: 'growth', label: 'Crescita', icon: '🌱', colorClass: 'bg-purple-500', dbField: 'growth' },
];

const WORK_AREA: LifeAreaConfig = { 
  key: 'work', label: 'Lavoro', icon: '💼', colorClass: 'bg-amber-500', dbField: 'work' 
};

const SCHOOL_AREA: LifeAreaConfig = { 
  key: 'school', label: 'Scuola', icon: '📚', colorClass: 'bg-blue-500', dbField: 'school' 
};

/**
 * Calculate age from birth_date or ageRange in onboarding_answers
 */
const getAgeFromProfile = (profile: any): number | null => {
  // First try birth_date
  if (profile?.birth_date) {
    const birthDate = new Date(profile.birth_date);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }
  
  // Fallback to ageRange from onboarding_answers
  const ageRange = profile?.onboarding_answers?.ageRange as string | undefined;
  if (ageRange) {
    switch (ageRange) {
      case '<18': return 16; // assume ~16
      case '18-24': return 21; // mid-range
      case '25-34': return 30;
      case '35-44': return 40;
      case '45-54': return 50;
      case '55+': return 60;
      default: return null;
    }
  }
  
  return null;
};

/**
 * Hook to determine which life areas to show based on user's occupation context
 * 
 * Logic:
 * - < 18 years: Always "School" only (auto-set)
 * - 18-27 years: Depends on occupation_context (student/worker/both) - if null, Aria should ask
 * - > 27 years: Default "Work" only, but can be "both" if set
 */
export const useOccupationContext = () => {
  const { profile, isLoading, updateProfile } = useProfile();
  
  const age = useMemo(() => getAgeFromProfile(profile), [profile]);
  
  const occupationContext = profile?.occupation_context as OccupationType | null | undefined;
  
  /**
   * Determines what occupation context applies
   * Returns: 'student' | 'worker' | 'both' | null (null = needs Aria to ask)
   */
  const effectiveOccupation = useMemo((): OccupationType | null => {
    if (age === null) return null; // No age data
    
    // < 18: Always student
    if (age < 18) {
      return 'student';
    }
    
    // 18-27: Use saved context or null (needs to be asked)
    if (age >= 18 && age <= 27) {
      return occupationContext || null;
    }
    
    // > 27: Default to worker, but respect 'both' if set
    if (age > 27) {
      return occupationContext === 'both' ? 'both' : 'worker';
    }
    
    return 'worker'; // fallback
  }, [age, occupationContext]);
  
  /**
   * Returns the list of life areas to display based on occupation
   */
  const lifeAreas = useMemo((): LifeAreaConfig[] => {
    const occupation = effectiveOccupation || 'worker'; // default to worker if unknown
    
    // Build the occupation-specific areas
    const occupationAreas: LifeAreaConfig[] = [];
    
    if (occupation === 'student') {
      occupationAreas.push(SCHOOL_AREA);
    } else if (occupation === 'worker') {
      occupationAreas.push(WORK_AREA);
    } else if (occupation === 'both') {
      occupationAreas.push(WORK_AREA, SCHOOL_AREA);
    }
    
    // Insert occupation areas after "love" (position 1)
    return [
      BASE_LIFE_AREAS[0], // love
      ...occupationAreas,
      ...BASE_LIFE_AREAS.slice(1), // social, health, growth
    ];
  }, [effectiveOccupation]);
  
  /**
   * Whether Aria needs to ask the user about their occupation
   * True for 18-27 users without occupation_context set
   */
  const needsOccupationClarification = useMemo(() => {
    if (age === null || isLoading) return false;
    return age >= 18 && age <= 27 && !occupationContext;
  }, [age, occupationContext, isLoading]);
  
  /**
   * Update the user's occupation context
   */
  const setOccupationContext = async (context: OccupationType) => {
    if (!profile) return;
    await updateProfile.mutateAsync({ occupation_context: context });
  };
  
  return {
    age,
    occupationContext: effectiveOccupation,
    lifeAreas,
    needsOccupationClarification,
    setOccupationContext,
    isLoading,
    // Expose constants for use elsewhere
    WORK_AREA,
    SCHOOL_AREA,
  };
};

export default useOccupationContext;
