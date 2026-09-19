import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Lock, Globe, ChevronRight, Crown } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { GROUP_TYPES } from '@/lib/constants';

interface Group {
  id: string;
  name: string;
  description: string;
  visibility: 'public' | 'private';
  group_type: string;
  avatar_url: string | null;
  is_official: boolean;
  creator_id: string;
  member_count?: number;
  is_member?: boolean;
}

export default function Groups() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchGroups();
    }
  }, [user]);

  const fetchGroups = async () => {
    // Fetch all groups
    const { data: groupsData, error } = await supabase
      .from('groups')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setLoading(false);
      return;
    }

    // Fetch member counts
    const groupIds = groupsData.map(g => g.id);
    const { data: membersData } = await supabase
      .from('group_members')
      .select('group_id')
      .in('group_id', groupIds)
      .eq('status', 'approved');

    const memberCounts = new Map<string, number>();
    membersData?.forEach(m => {
      memberCounts.set(m.group_id, (memberCounts.get(m.group_id) || 0) + 1);
    });

    // Check user membership
    const { data: userMemberships } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', user?.id)
      .eq('status', 'approved');

    const userGroupIds = new Set(userMemberships?.map(m => m.group_id) || []);

    const enrichedGroups = groupsData.map(g => ({
      ...g,
      member_count: memberCounts.get(g.id) || 0,
      is_member: userGroupIds.has(g.id) || g.creator_id === user?.id,
    }));

    setGroups(enrichedGroups.filter(g => !g.is_member));
    setMyGroups(enrichedGroups.filter(g => g.is_member));
    setLoading(false);
  };

  const joinGroup = async (groupId: string, isPrivate: boolean) => {
    const { error } = await supabase
      .from('group_members')
      .insert({
        group_id: groupId,
        user_id: user?.id,
        role: 'member',
        status: isPrivate ? 'pending' : 'approved',
      });

    if (!error) {
      fetchGroups();
    }
  };

  const getGroupTypeLabel = (type: string) => {
    return GROUP_TYPES.find(t => t.value === type)?.label || type;
  };

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout>
      <PageHeader 
        title="Groups" 
        subtitle="Join or create community groups"
        action={
          <Button 
            size="sm" 
            className="rounded-full bg-gradient-primary shadow-primary"
            onClick={() => navigate('/groups/create')}
          >
            <Plus className="w-4 h-4 mr-1" />
            Create
          </Button>
        }
      />

      <div className="px-4 py-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 rounded-full h-12"
          />
        </div>

        {/* My Groups */}
        {myGroups.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-display font-bold text-lg">My Groups</h2>
            {myGroups.map((group) => (
              <Card 
                key={group.id} 
                className="p-4 shadow-soft cursor-pointer hover:shadow-elevated transition-shadow"
                onClick={() => navigate(`/groups/${group.id}`)}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={group.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                      {group.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{group.name}</h3>
                      {group.is_official && (
                        <Crown className="w-4 h-4 text-warning" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {getGroupTypeLabel(group.group_type)}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {group.member_count}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Discover Groups */}
        <div className="space-y-3">
          <h2 className="font-display font-bold text-lg">Discover</h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
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
          ) : filteredGroups.length === 0 ? (
            <Card className="p-8 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">No groups found</h3>
              <p className="text-muted-foreground">Be the first to create one!</p>
            </Card>
          ) : (
            filteredGroups.map((group) => (
              <Card key={group.id} className="p-4 shadow-soft">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={group.avatar_url || undefined} />
                    <AvatarFallback className="bg-muted">
                      {group.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{group.name}</h3>
                      {group.visibility === 'private' ? (
                        <Lock className="w-3 h-3 text-muted-foreground" />
                      ) : (
                        <Globe className="w-3 h-3 text-muted-foreground" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">{group.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {getGroupTypeLabel(group.group_type)}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {group.member_count}
                      </span>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    className="rounded-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      joinGroup(group.id, group.visibility === 'private');
                    }}
                  >
                    {group.visibility === 'private' ? 'Request' : 'Join'}
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
