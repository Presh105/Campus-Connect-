import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useAppUpdates() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: updates } = await supabase.from('app_updates' as any).select('*').order('created_at', { ascending: false }).limit(5) as any;
      if (!updates?.length) return;
      const { data: reads } = await supabase.from('app_update_reads' as any).select('update_id').eq('user_id', user.id) as any;
      const readSet = new Set((reads || []).map((r: any) => r.update_id));
      const unread = updates.filter((u: any) => !readSet.has(u.id));
      for (const u of unread) {
        toast.message(`📢 ${u.title}`, { description: u.message });
        await supabase.from('app_update_reads' as any).insert({ user_id: user.id, update_id: u.id } as any);
      }
    })();
  }, [user]);
}
