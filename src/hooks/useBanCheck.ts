 import { useState, useEffect } from 'react';
 import { useAuth } from '@/contexts/AuthContext';
 import { supabase } from '@/integrations/supabase/client';
 
 export function useBanCheck(feature: string) {
   const { user } = useAuth();
   const [isBanned, setIsBanned] = useState(false);
   const [loading, setLoading] = useState(true);
 
   useEffect(() => {
     if (!user) {
       setLoading(false);
       return;
     }
 
     const checkBan = async () => {
       const { data } = await supabase
         .from('user_bans')
         .select('id')
         .eq('user_id', user.id)
         .eq('banned_from', feature)
         .single();
 
       setIsBanned(!!data);
       setLoading(false);
     };
 
     checkBan();
   }, [user, feature]);
 
   return { isBanned, loading };
 }