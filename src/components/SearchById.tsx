import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export function SearchById() {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async () => {
    const q = query.trim().replace('#', '').toUpperCase();
    if (!q) return;
    setSearching(true);

    const { data: post } = await supabase.from('posts').select('id').eq('short_id', q).limit(1).single();
    if (post) { navigate(`/post/${post.id}`); setQuery(''); setSearching(false); return; }

    const { data: listing } = await supabase.from('listings').select('id').eq('short_id', q).limit(1).single();
    if (listing) { navigate(`/listing/${listing.id}`); setQuery(''); setSearching(false); return; }

    const { data: profile } = await supabase.from('profiles').select('user_id').eq('system_id', `CC-${q}`).limit(1).single();
    if (profile) { toast.success('User found'); setQuery(''); setSearching(false); return; }

    const { data: profile2 } = await supabase.from('profiles').select('user_id').eq('system_id', q).limit(1).single();
    if (profile2) { toast.success('User found'); setQuery(''); setSearching(false); return; }

    const { data: event } = await supabase.from('events').select('id').eq('short_id', q).limit(1).single();
    if (event) { toast.success('Event found'); setQuery(''); setSearching(false); return; }

    toast.error('No content found with that ID');
    setSearching(false);
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search posts, listings, users by ID..."
            className="pl-9 h-9 text-sm rounded-full bg-muted/50 border-border"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          {query && (
            <button className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setQuery('')}>
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
        {query.trim() && (
          <Button size="sm" onClick={handleSearch} disabled={searching} className="rounded-full h-9 shrink-0">
            {searching ? '...' : 'Find'}
          </Button>
        )}
      </div>
    </div>
  );
}
