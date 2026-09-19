import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MessageCircle, User, FileText, Image, Clock } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface PrivateMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  file_url: string | null;
  file_type: string | null;
  created_at: string;
  is_read: boolean;
  sender?: {
    full_name: string;
    avatar_url: string | null;
  };
  receiver?: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface Conversation {
  participantIds: string[];
  participants: { id: string; name: string; avatar: string | null }[];
  lastMessage: string;
  lastMessageTime: string;
  messageCount: number;
}

export default function AdminMessages() {
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useAdmin();
  const { user, loading: authLoading } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
    if (!roleLoading && !isAdmin) {
      navigate('/');
    }
  }, [user, isAdmin, authLoading, roleLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchConversations();
    }
  }, [isAdmin]);

  const fetchConversations = async () => {
    // Get all private messages
    const { data: messagesData, error } = await supabase
      .from('private_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setLoading(false);
      return;
    }

    // Get unique conversation pairs
    const conversationMap = new Map<string, PrivateMessage[]>();
    
    messagesData.forEach(msg => {
      const key = [msg.sender_id, msg.receiver_id].sort().join('-');
      const existing = conversationMap.get(key) || [];
      conversationMap.set(key, [...existing, msg]);
    });

    // Get all user IDs
    const userIds = new Set<string>();
    messagesData.forEach(msg => {
      userIds.add(msg.sender_id);
      userIds.add(msg.receiver_id);
    });

    // Fetch profiles
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url')
      .in('user_id', Array.from(userIds));

    const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

    // Build conversations
    const convos: Conversation[] = [];
    conversationMap.forEach((msgs, key) => {
      const [id1, id2] = key.split('-');
      const profile1 = profilesMap.get(id1);
      const profile2 = profilesMap.get(id2);
      
      convos.push({
        participantIds: [id1, id2],
        participants: [
          { id: id1, name: profile1?.full_name || 'Unknown', avatar: profile1?.avatar_url || null },
          { id: id2, name: profile2?.full_name || 'Unknown', avatar: profile2?.avatar_url || null },
        ],
        lastMessage: msgs[0].content,
        lastMessageTime: msgs[0].created_at,
        messageCount: msgs.length,
      });
    });

    // Sort by last message time
    convos.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
    
    setConversations(convos);
    setLoading(false);
  };

  const fetchConversationMessages = async (conversation: Conversation) => {
    setMessagesLoading(true);
    setSelectedConversation(conversation);

    const [id1, id2] = conversation.participantIds;

    const { data, error } = await supabase
      .from('private_messages')
      .select('*')
      .or(`and(sender_id.eq.${id1},receiver_id.eq.${id2}),and(sender_id.eq.${id2},receiver_id.eq.${id1})`)
      .order('created_at', { ascending: true });

    if (!error && data) {
      // Map profiles
      const msgs = data.map(msg => ({
        ...msg,
        sender: conversation.participants.find(p => p.id === msg.sender_id) 
          ? { full_name: conversation.participants.find(p => p.id === msg.sender_id)!.name, avatar_url: conversation.participants.find(p => p.id === msg.sender_id)!.avatar }
          : undefined,
        receiver: conversation.participants.find(p => p.id === msg.receiver_id)
          ? { full_name: conversation.participants.find(p => p.id === msg.receiver_id)!.name, avatar_url: conversation.participants.find(p => p.id === msg.receiver_id)!.avatar }
          : undefined,
      }));
      setMessages(msgs);
    }

    setMessagesLoading(false);
  };

  const filteredConversations = conversations.filter(c =>
    c.participants.some(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading || roleLoading || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        title="Private Messages" 
        subtitle="Monitor conversations for security"
        showBack
      />

      <div className="px-4 py-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 rounded-full h-12"
          />
        </div>

        {/* Conversations List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="w-32 h-4 bg-muted rounded" />
                    <div className="w-full h-3 bg-muted rounded" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <Card className="p-8 text-center">
            <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No conversations found</h3>
            <p className="text-muted-foreground">Private messages will appear here</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredConversations.map((conversation, index) => (
              <Card 
                key={index} 
                className="p-4 shadow-soft cursor-pointer hover:shadow-elevated transition-shadow"
                onClick={() => fetchConversationMessages(conversation)}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={conversation.participants[0].avatar || undefined} />
                      <AvatarFallback>{conversation.participants[0].name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <Avatar className="w-8 h-8 absolute -bottom-1 -right-1 border-2 border-background">
                      <AvatarImage src={conversation.participants[1].avatar || undefined} />
                      <AvatarFallback>{conversation.participants[1].name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">
                      {conversation.participants[0].name} & {conversation.participants[1].name}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">{conversation.lastMessage}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="mb-1">
                      {conversation.messageCount} msgs
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(conversation.lastMessageTime), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Message Dialog */}
        <Dialog open={!!selectedConversation} onOpenChange={() => setSelectedConversation(null)}>
          <DialogContent className="max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>
                {selectedConversation?.participants.map(p => p.name).join(' & ')}
              </DialogTitle>
            </DialogHeader>
            
            {messagesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <ScrollArea className="flex-1 max-h-[50vh]">
                <div className="space-y-4 py-4">
                  {messages.map((message) => (
                    <div key={message.id} className="flex gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={message.sender?.avatar_url || undefined} />
                        <AvatarFallback>{message.sender?.full_name?.charAt(0) || '?'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">{message.sender?.full_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm">{message.content}</p>
                        {message.file_url && (
                          <div className="mt-2">
                            {message.file_type?.startsWith('image/') ? (
                              <img 
                                src={message.file_url} 
                                alt="Attachment" 
                                className="max-w-[200px] rounded-lg"
                              />
                            ) : (
                              <a 
                                href={message.file_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-primary hover:underline"
                              >
                                <FileText className="w-4 h-4" />
                                View attachment
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
