import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Shield, User, Crown, UserX, MoreVertical } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DEPARTMENTS, LEVELS, USER_ROLES } from '@/lib/constants';

interface UserProfile {
  user_id: string;
  full_name: string;
  department: string;
  level: string;
  avatar_url: string | null;
  is_anonymous: boolean;
  is_official: boolean;
  user_role: string;
  faculty: string;
  roles: string[];
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useAdmin();
  const { user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

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
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) {
      toast.error('Failed to fetch users');
      setLoading(false);
      return;
    }

    // Fetch roles for all users
    const userIds = profilesData.map(p => p.user_id);
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('user_id', userIds);

    const rolesMap = new Map<string, string[]>();
    rolesData?.forEach(r => {
      const existing = rolesMap.get(r.user_id) || [];
      rolesMap.set(r.user_id, [...existing, r.role]);
    });

    const usersWithRoles = profilesData.map(p => ({
      ...p,
      roles: rolesMap.get(p.user_id) || [],
    }));

    setUsers(usersWithRoles);
    setLoading(false);
  };

  const assignRole = async (userId: string, role: 'admin' | 'moderator') => {
    const { error } = await supabase
      .from('user_roles')
      .insert({ user_id: userId, role: role as 'admin' | 'moderator' | 'user' });

    if (error) {
      if (error.code === '23505') {
        toast.error('User already has this role');
      } else {
        toast.error('Failed to assign role');
      }
    } else {
      toast.success(`${role} role assigned`);
      fetchUsers();
    }
  };

  const removeRole = async (userId: string, role: string) => {
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', role as 'admin' | 'moderator' | 'user');

    if (error) {
      toast.error('Failed to remove role');
    } else {
      toast.success('Role removed');
      fetchUsers();
    }
  };

  const toggleOfficial = async (userId: string, isOfficial: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_official: !isOfficial })
      .eq('user_id', userId);

    if (error) {
      toast.error('Failed to update official status');
    } else {
      toast.success(isOfficial ? 'Official status removed' : 'Marked as official');
      fetchUsers();
    }
  };

  const getDepartmentLabel = (value: string) => {
    return DEPARTMENTS.find(d => d.value === value)?.label || value;
  };

  const getUserRoleLabel = (value: string) => {
    return USER_ROLES.find(r => r.value === value)?.label || value;
  };

  const filteredUsers = users.filter(u => 
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.department.toLowerCase().includes(searchQuery.toLowerCase())
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
        title="User Management" 
        subtitle={`${users.length} registered users`}
        showBack
      />

      <div className="px-4 py-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 rounded-full h-12"
          />
        </div>

        {/* Users List */}
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
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((userProfile) => (
              <Card key={userProfile.user_id} className="p-4 shadow-soft">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12 ring-2 ring-border">
                    <AvatarImage src={userProfile.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                      {userProfile.full_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{userProfile.full_name}</p>
                      {userProfile.is_official && (
                        <Badge variant="default" className="bg-primary text-xs">OFFICIAL</Badge>
                      )}
                      {userProfile.roles.includes('admin') && (
                        <Badge variant="destructive" className="text-xs">ADMIN</Badge>
                      )}
                      {userProfile.roles.includes('moderator') && (
                        <Badge variant="secondary" className="text-xs">MOD</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {getDepartmentLabel(userProfile.department)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {getUserRoleLabel(userProfile.user_role || 'student')}
                      </Badge>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {!userProfile.roles.includes('admin') && (
                        <DropdownMenuItem onClick={() => assignRole(userProfile.user_id, 'admin')}>
                          <Crown className="w-4 h-4 mr-2" />
                          Make Admin
                        </DropdownMenuItem>
                      )}
                      {userProfile.roles.includes('admin') && userProfile.user_id !== user?.id && (
                        <DropdownMenuItem onClick={() => removeRole(userProfile.user_id, 'admin')}>
                          <UserX className="w-4 h-4 mr-2" />
                          Remove Admin
                        </DropdownMenuItem>
                      )}
                      {!userProfile.roles.includes('moderator') && (
                        <DropdownMenuItem onClick={() => assignRole(userProfile.user_id, 'moderator')}>
                          <Shield className="w-4 h-4 mr-2" />
                          Make Moderator
                        </DropdownMenuItem>
                      )}
                      {userProfile.roles.includes('moderator') && (
                        <DropdownMenuItem onClick={() => removeRole(userProfile.user_id, 'moderator')}>
                          <UserX className="w-4 h-4 mr-2" />
                          Remove Moderator
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => toggleOfficial(userProfile.user_id, userProfile.is_official)}>
                        <User className="w-4 h-4 mr-2" />
                        {userProfile.is_official ? 'Remove Official Status' : 'Mark as Official'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
