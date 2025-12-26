import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type AppRole = 'patient' | 'doctor';

interface UseUserRoleReturn {
  role: AppRole | null;
  isLoading: boolean;
  isDoctor: boolean;
  isPatient: boolean;
  setUserRole: (role: AppRole) => Promise<{ error: Error | null }>;
  refetch: () => Promise<void>;
}

export const useUserRole = (): UseUserRoleReturn => {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRole = async () => {
    if (!user) {
      setRole(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        setRole(null);
      } else if (data) {
        setRole(data.role as AppRole);
      } else {
        // No role found - user might be new
        setRole(null);
      }
    } catch (err) {
      console.error('Error in fetchRole:', err);
      setRole(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRole();
  }, [user]);

  const setUserRole = async (newRole: AppRole): Promise<{ error: Error | null }> => {
    if (!user) {
      return { error: new Error('User not authenticated') };
    }

    try {
      // Check if role already exists
      const { data: existing } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', user.id);
        
        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: user.id, role: newRole });
        
        if (error) throw error;
      }

      setRole(newRole);
      return { error: null };
    } catch (err) {
      console.error('Error setting user role:', err);
      return { error: err as Error };
    }
  };

  return {
    role,
    isLoading,
    isDoctor: role === 'doctor',
    isPatient: role === 'patient',
    setUserRole,
    refetch: fetchRole,
  };
};