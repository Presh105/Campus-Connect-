import { useState, useEffect, useRef } from 'react';
import { Send, Users, Paperclip, FileText, Search } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { DEPARTMENTS, LEVELS } from '@/lib/constants';
import { useNavigate } from 'react-router-dom';

interface Conversation {
  recipientId: string;
  recipientName: string;
  recipientAvatar: string | null;
  recipientDepartment: string;
  recipientLevel: string;
  displayNumber: number;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

interface Student {
  user_id: string;
  full_name: string;
  department: string;
  level: string;
  avatar_url: string | null;
  is_anonymous: boolean;
  display_number: number;
}

export default function Chat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchConversations();
      fetchStudents();
    }
  }, [user]);

  const fetchConversations = async () => {
    if (!user) return;

    // Get all private messages involving user
    const { data: messages, error } = await supabase
      .from('private_messages')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error || !messages) {
      setLoading(false);
      return;
    }

    // Group by conversation partner
    const conversationMap = new Map<string, any>();
    messages.forEach(msg => {
      const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, {
          recipientId: partnerId,
          lastMessage: msg.content,
          lastMessageTime: msg.created_at,
          unreadCount: msg.receiver_id === user.id && !msg.is_read ? 1 : 0,
        });
      } else if (msg.receiver_id === user.id && !msg.is_read) {
        const conv = conversationMap.get(partnerId);
        conv.unreadCount++;
      }
    });

    // Fetch profiles for conversation partners
    const partnerIds = Array.from(conversationMap.keys());
    if (partnerIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, department, level, display_number')
        .in('user_id', partnerIds);

      if (profiles) {
        const profilesMap = new Map(profiles.map(p => [p.user_id, p]));
        const convs: Conversation[] = Array.from(conversationMap.values()).map(conv => {
          const profile = profilesMap.get(conv.recipientId);
          return {
            ...conv,
            recipientName: profile?.full_name || 'Member',
            recipientAvatar: profile?.avatar_url || null,
            recipientDepartment: profile?.department || '',
            recipientLevel: profile?.level || '',
            displayNumber: profile?.display_number || 0,
          };
        });
        setConversations(convs);
      }
    }

    setLoading(false);
  };

  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, full_name, department, level, avatar_url, is_anonymous, display_number')
      .neq('user_id', user?.id || '');

    if (!error && data) {
      setStudents(data);
    }
  };

  const getDepartmentLabel = (value: string) => {
    return DEPARTMENTS.find(d => d.value === value)?.label || value;
  };

  const getLevelLabel = (value: string) => {
    return LEVELS.find(l => l.value === value)?.label || value;
  };

  const filteredStudents = students.filter(student => {
    const query = searchQuery.toLowerCase();
    const searchableName = student.is_anonymous ? 'anonymous member' : student.full_name.toLowerCase();
    const searchableDept = getDepartmentLabel(student.department).toLowerCase();
    return searchableName.includes(query) || searchableDept.includes(query);
  });

  const startChat = (studentId: string) => {
    navigate(`/chat/private/${studentId}`);
  };

  return (
    <AppLayout>
      <PageHeader 
        title="Messages" 
        subtitle="Private conversations"
        action={
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => setShowSearch(!showSearch)}
          >
            <Search className="w-5 h-5" />
          </Button>
        }
      />

      <div className="px-4 py-4 space-y-4">
        {/* Search for new conversation */}
        {showSearch && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search members to message..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 rounded-full h-12"
              />
            </div>

            {searchQuery && (
              <Card className="p-2 max-h-60 overflow-y-auto">
                {filteredStudents.slice(0, 5).map((student) => (
                  <button
                    key={student.user_id}
                    onClick={() => startChat(student.user_id)}
                    className="w-full flex items-center gap-3 p-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={student.avatar_url || undefined} />
                      <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                        {student.full_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <p className="font-medium text-sm">
                        {student.is_anonymous ? 'Anonymous Member' : student.full_name}
                        {student.display_number > 1 && `#${student.display_number}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getDepartmentLabel(student.department)}
                      </p>
                    </div>
                  </button>
                ))}
              </Card>
            )}
          </div>
        )}

        {/* Conversations List */}
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
        ) : conversations.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-display font-bold text-lg mb-2">No conversations yet</h3>
            <p className="text-muted-foreground mb-4">
              Search for members above to start a conversation
            </p>
            <Button 
              onClick={() => setShowSearch(true)}
              className="rounded-full"
            >
              Find Members
            </Button>
          </Card>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv) => (
              <Card 
                key={conv.recipientId} 
                className="p-4 shadow-soft cursor-pointer hover:shadow-elevated transition-shadow"
                onClick={() => startChat(conv.recipientId)}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12 ring-2 ring-border">
                    <AvatarImage src={conv.recipientAvatar || undefined} />
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                      {conv.recipientName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold truncate">
                        {conv.recipientName}
                        {conv.displayNumber > 1 && (
                          <span className="text-muted-foreground">#{conv.displayNumber}</span>
                        )}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(conv.lastMessageTime), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
                      {conv.unreadCount > 0 && (
                        <Badge className="bg-primary text-primary-foreground ml-2">
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
