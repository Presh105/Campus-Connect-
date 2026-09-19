import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export function useAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkRoles();
    } else {
      setIsAdmin(false);
      setIsModerator(false);
      setIsSuperAdmin(false);
      setLoading(false);
    }
  }, [user]);

  const checkRoles = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_roles')
      .select('role, is_super_admin')
      .eq('user_id', user.id);

    if (!error && data) {
      const roles = data.map(r => r.role);
      const hasSuperAdmin = data.some(r => r.is_super_admin);
      setIsAdmin(roles.includes('admin'));
      setIsModerator(roles.includes('moderator') || roles.includes('admin'));
      setIsSuperAdmin(hasSuperAdmin);
    }

    setLoading(false);
  };

  return { isAdmin, isModerator, isSuperAdmin, loading };
}
