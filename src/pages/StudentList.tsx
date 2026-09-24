import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MessageCircle, MessageCircleOff, User } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Member {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  is_anonymous: boolean;
  chat_enabled: boolean;
}

export default function StudentList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url, is_anonymous, chat_enabled')
      .neq('user_id', user?.id || '');

    if (!error && data) {
      setMembers(data as Member[]);
    }
    setLoading(false);
  };

  const filteredMembers = members.filter(member => {
    const query = searchQuery.toLowerCase();
    const searchableName = member.is_anonymous ? 'anonymous member' : member.full_name.toLowerCase();
    return searchableName.includes(query);
  });

  const startChat = (e: React.MouseEvent, member: Member) => {
    e.stopPropagation();
    if (!member.chat_enabled) { toast.message('This member has turned off chats.'); return; }
    navigate(`/chat/private/${member.user_id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Members"
        subtitle="Find and message other members"
        showBack
      />

      <div className="px-4 py-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 rounded-full h-12"
          />
        </div>

        {/* Member List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="w-32 h-4 bg-muted rounded" />
                    <div className="w-24 h-3 bg-muted rounded" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : filteredMembers.length === 0 ? (
          <Card className="p-8 text-center">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No members found</h3>
            <p className="text-muted-foreground">Try a different search term</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredMembers.map((member) => (
              <Card
                key={member.user_id}
                className="p-4 shadow-soft cursor-pointer hover:shadow-elevated transition-shadow"
                onClick={() => navigate(`/profile/${member.user_id}`)}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12 ring-2 ring-border">
                    {member.is_anonymous ? (
                      <AvatarFallback className="bg-muted">
                        <User className="w-6 h-6 text-muted-foreground" />
                      </AvatarFallback>
                    ) : (
                      <>
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                          {member.full_name.charAt(0)}
                        </AvatarFallback>
                      </>
                    )}
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">
                      {member.is_anonymous ? 'Anonymous Member' : member.full_name}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="rounded-full"
                    disabled={!member.chat_enabled}
                    onClick={(e) => startChat(e, member)}
                    title={member.chat_enabled ? 'Message' : 'Chats turned off'}
                  >
                    {member.chat_enabled ? <MessageCircle className="w-5 h-5" /> : <MessageCircleOff className="w-5 h-5 opacity-40" />}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
      }
