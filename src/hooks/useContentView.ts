import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useContentView(contentType: string, contentId: string | undefined) {
  const { user } = useAuth();
  const tracked = useRef(false);

  useEffect(() => {
    if (!contentId || !user || tracked.current) return;
    tracked.current = true;

    const recordView = async () => {
      // Upsert to content_views (unique per user+content)
      await supabase.from('content_views').upsert(
        { content_type: contentType, content_id: contentId, user_id: user.id },
        { onConflict: 'content_type,content_id,user_id' }
      );

      // Get total view count and update the source table
      const { count } = await supabase
        .from('content_views')
        .select('*', { count: 'exact', head: true })
        .eq('content_type', contentType)
        .eq('content_id', contentId);

      if (count !== null) {
        const table = contentType === 'post' ? 'posts' : contentType === 'task' ? 'tasks' : contentType === 'listing' ? 'listings' : null;
        if (table) {
          await supabase.from(table).update({ view_count: count }).eq('id', contentId);
        }
      }
    };

    recordView();
  }, [contentId, user, contentType]);
}
