import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Settings, Send, Plus, Image, FileText, Crown, Lock, Globe, UserPlus, LogOut } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { GROUP_TYPES } from '@/lib/constants';
import { ImageUpload } from '@/components/ImageUpload';

interface Group {
  id: string;
  name: string;
  description: string;
  visibility: string;
  group_type: string;
  avatar_url: string | null;
  allow_anonymous_posts: boolean;
  is_official: boolean;
  creator_id: string;
}

interface GroupPost {
  id: string;
  content: string;
  image_url: string | null;
  file_url: string | null;
  is_anonymous: boolean;
  is_pinned: boolean;
  likes_count: number;
  created_at: string;
  user_id: string;
  profile?: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  status: string;
  profile?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export default function GroupDetail() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [pendingMembers, setPendingMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [newPost, setNewPost] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [postImageUrl, setPostImageUrl] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (groupId) {
      fetchGroup();
      fetchPosts();
      fetchMembers();
    }
  }, [groupId, user]);

  const fetchGroup = async () => {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (!error && data) {
      setGroup(data);
    }
    setLoading(false);
  };

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('group_posts')
      .select('*')
      .eq('group_id', groupId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Fetch profiles
      const userIds = data.map(p => p.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      const postsWithProfiles = data.map(p => ({
        ...p,
        profile: profileMap.get(p.user_id),
      }));

      setPosts(postsWithProfiles);
    }
  };

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupId);

    if (!error && data) {
      const userIds = data.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const membersWithProfiles = data.map(m => ({
        ...m,
        profile: profileMap.get(m.user_id),
      }));

      setMembers(membersWithProfiles.filter(m => m.status === 'approved'));
      setPendingMembers(membersWithProfiles.filter(m => m.status === 'pending'));

      // Check if current user is admin
      const currentMember = membersWithProfiles.find(m => m.user_id === user?.id);
      setIsMember(!!currentMember && currentMember.status === 'approved');
      setIsAdmin(currentMember?.role === 'admin');
    }
  };

  const handlePost = async () => {
    if (!newPost.trim()) return;
    
    setPosting(true);

    const { error } = await supabase.from('group_posts').insert({
      group_id: groupId,
      user_id: user?.id,
      content: newPost,
      image_url: postImageUrl || null,
      is_anonymous: isAnonymous,
    });

    if (error) {
      toast.error('Failed to post');
    } else {
      setNewPost('');
      setPostImageUrl('');
      setIsAnonymous(false);
      fetchPosts();
    }

    setPosting(false);
  };

  const approveMember = async (memberId: string) => {
    const { error } = await supabase
      .from('group_members')
      .update({ status: 'approved' })
      .eq('id', memberId);

    if (!error) {
      toast.success('Member approved');
      fetchMembers();
    }
  };

  const removeMember = async (memberId: string) => {
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('id', memberId);

    if (!error) {
      toast.success('Member removed');
      fetchMembers();
    }
  };

  const leaveGroup = async () => {
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', user?.id);

    if (!error) {
      toast.success('Left group');
      navigate('/groups');
    }
  };

  const getGroupTypeLabel = (type: string) => {
    return GROUP_TYPES.find(t => t.value === type)?.label || type;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Group not found" showBack />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader 
        title={group.name} 
        showBack
        action={
          isAdmin && (
            <Button size="icon" variant="ghost" className="rounded-full">
              <Settings className="w-5 h-5" />
            </Button>
          )
        }
      />

      {/* Group Header */}
      <Card className="mx-4 p-4 shadow-soft">
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src={group.avatar_url || undefined} />
            <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xl">
              {group.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-lg">{group.name}</h2>
              {group.is_official && <Crown className="w-4 h-4 text-warning" />}
            </div>
            <p className="text-sm text-muted-foreground">{group.description}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline">{getGroupTypeLabel(group.group_type)}</Badge>
              <Badge variant="secondary" className="flex items-center gap-1">
                {group.visibility === 'private' ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                {group.visibility}
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {members.length}
              </Badge>
            </div>
          </div>
        </div>
        {isMember && !isAdmin && (
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-4 w-full"
            onClick={leaveGroup}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Leave Group
          </Button>
        )}
      </Card>

      <Tabs defaultValue="posts" className="px-4 mt-4">
        <TabsList className="w-full">
          <TabsTrigger value="posts" className="flex-1">Posts</TabsTrigger>
          <TabsTrigger value="members" className="flex-1">Members</TabsTrigger>
          {isAdmin && pendingMembers.length > 0 && (
            <TabsTrigger value="pending" className="flex-1">
              Pending ({pendingMembers.length})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="posts" className="space-y-4 mt-4">
          {/* New Post */}
          {isMember && (
            <Card className="p-4">
              <Textarea
                placeholder="Share something with the group..."
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                rows={3}
              />
              {group.allow_anonymous_posts && (
                <div className="flex items-center gap-2 mt-2">
                  <Switch
                    checked={isAnonymous}
                    onCheckedChange={setIsAnonymous}
                    id="anonymous"
                  />
                  <Label htmlFor="anonymous" className="text-sm">Post anonymously</Label>
                </div>
              )}
              <div className="flex items-center justify-between mt-3">
                <div className="flex gap-2">
                  {user && (
                    <ImageUpload
                      bucket="posts"
                      userId={user.id}
                      onUpload={setPostImageUrl}
                    />
                  )}
                </div>
                <Button 
                  size="sm" 
                  onClick={handlePost}
                  disabled={!newPost.trim() || posting}
                >
                  <Send className="w-4 h-4 mr-1" />
                  Post
                </Button>
              </div>
            </Card>
          )}

          {/* Posts */}
          {posts.length === 0 ? (
            <Card className="p-8 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No posts yet</p>
            </Card>
          ) : (
            posts.map((post) => (
              <Card key={post.id} className={`p-4 ${post.is_pinned ? 'border-primary' : ''}`}>
                {post.is_pinned && (
                  <Badge variant="default" className="mb-2">Pinned</Badge>
                )}
                <div className="flex items-start gap-3">
                  <Avatar className="w-10 h-10">
                    {post.is_anonymous ? (
                      <AvatarFallback>?</AvatarFallback>
                    ) : (
                      <>
                        <AvatarImage src={post.profile?.avatar_url || undefined} />
                        <AvatarFallback>{post.profile?.full_name?.charAt(0) || '?'}</AvatarFallback>
                      </>
                    )}
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">
                        {post.is_anonymous ? 'Anonymous' : post.profile?.full_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm">{post.content}</p>
                    {post.image_url && (
                      <img 
                        src={post.image_url} 
                        alt="Post" 
                        className="mt-2 rounded-lg max-h-64 object-cover"
                      />
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="members" className="space-y-3 mt-4">
          {members.map((member) => (
            <Card key={member.id} className="p-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={member.profile?.avatar_url || undefined} />
                  <AvatarFallback>{member.profile?.full_name?.charAt(0) || '?'}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold">{member.profile?.full_name}</p>
                  {member.role === 'admin' && (
                    <Badge variant="secondary" className="text-xs">Admin</Badge>
                  )}
                </div>
                {isAdmin && member.user_id !== user?.id && (
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => removeMember(member.id)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </TabsContent>

        {isAdmin && (
          <TabsContent value="pending" className="space-y-3 mt-4">
            {pendingMembers.length === 0 ? (
              <Card className="p-8 text-center">
                <UserPlus className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No pending requests</p>
              </Card>
            ) : (
              pendingMembers.map((member) => (
                <Card key={member.id} className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={member.profile?.avatar_url || undefined} />
                      <AvatarFallback>{member.profile?.full_name?.charAt(0) || '?'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold">{member.profile?.full_name}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm"
                        onClick={() => approveMember(member.id)}
                      >
                        Approve
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => removeMember(member.id)}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
