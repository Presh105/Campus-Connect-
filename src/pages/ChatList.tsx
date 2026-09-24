import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, User, Image as ImageIcon, Search } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface RecentChat {
  other_user_id: string;
  other_full_name: string;
  other_avatar_url: string | null;
  other_is_anonymous: boolean;
  last_message: string;
  last_message_at: string;
  last_message_file_type: string | null;
  last_sender_id: string;
  unread_count: number;
}

export default function ChatList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [chats, setChats] = useState<RecentChat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChats();

    const channel = supabase
      .channel('chat-list-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'private_messages' }, () => {
        fetchChats();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchChats = async () => {
    const { data, error } = await supabase.rpc('get_recent_chats');
    if (!error && data) setChats(data as RecentChat[]);
    setLoading(false);
  };

  const filtered = chats.filter(c => {
    const name = c.other_is_anonymous ? 'anonymous member' : c.other_full_name.toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  return (
    <AppLayout>
      <PageHeader title="Chats" subtitle="Your recent conversations" showBack />

      <div className="px-4 py-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 rounded-full h-12"
          />
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="w-32 h-4 bg-muted rounded" />
                    <div className="w-48 h-3 bg-muted rounded" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-8 text-center animate-in fade-in duration-300">
            <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No chats yet</h3>
            <p className="text-muted-foreground">
              Visit someone's profile and tap the chat icon to start a conversation.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((chat, i) => {
              const isUnread = chat.unread_count > 0;
              const iSentLast = chat.last_sender_id === user?.id;
              return (
                <Card
                  key={chat.other_user_id}
                  onClick={() => navigate(`/chat/private/${chat.other_user_id}`)}
                  style={{ animationDelay: `${i * 40}ms` }}
                  className="p-4 shadow-soft cursor-pointer transition-all hover:shadow-elevated hover:-translate-y-0.5 active:scale-[0.98] animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12 ring-2 ring-border">
                      {chat.other_is_anonymous ? (
                        <AvatarFallback className="bg-muted">
                          <User className="w-6 h-6 text-muted-foreground" />
                        </AvatarFallback>
                      ) : (
                        <>
                          <AvatarImage src={chat.other_avatar_url || undefined} />
                          <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                            {chat.other_full_name.charAt(0)}
                          </AvatarFallback>
                        </>
                      )}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`truncate ${isUnread ? 'font-bold' : 'font-semibold'}`}>
                          {chat.other_is_anonymous ? 'Anonymous Member' : chat.other_full_name}
                        </p>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatDistanceToNow(new Date(chat.last_message_at), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className={`text-sm truncate flex items-center gap-1 ${isUnread ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                          {iSentLast && <span className="text-muted-foreground">You:</span>}
                          {chat.last_message_file_type === 'image' ? (
                            <span className="flex items-center gap-1"><ImageIcon className="w-3.5 h-3.5" /> Photo</span>
                          ) : (
                            chat.last_message
                          )}
                        </p>
                        {isUnread && (
                          <Badge className="rounded-full h-5 min-w-5 px-1.5 flex items-center justify-center text-xs bg-gradient-primary">
                            {chat.unread_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
