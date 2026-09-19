import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, User, MessageCircle, Calendar } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { DEPARTMENTS, LEVELS, USER_ROLES } from '@/lib/constants';
import { format } from 'date-fns';
import { CopyableId } from '@/components/CopyableId';

interface Member {
  id: string;
  user_id: string;
  full_name: string;
  department: string;
  level: string;
  faculty: string | null;
  gender: string | null;
  user_role: string | null;
  avatar_url: string | null;
  is_anonymous: boolean;
  reg_number: string | null;
  display_number: number;
  created_at: string;
  system_id: string | null;
}

export default function AdminStudents() {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [members, setMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminLoading && !isAdmin) navigate('/');
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) fetchMembers();
  }, [isAdmin]);

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from('profiles').select('*').order('created_at', { ascending: false });
    if (!error && data) setMembers(data);
    setLoading(false);
  };

  // Legacy fields (department/level/faculty/reg_number) only carry real
  // data for accounts created before the general-signup rebrand. New
  // members default to 'general' / '0' — those are hidden rather than
  // shown as a badge.
  const getDepartmentLabel = (value: string) => DEPARTMENTS.find(d => d.value === value)?.label || value;
  const getLevelLabel = (value: string) => LEVELS.find(l => l.value === value)?.label || value;
  const getRoleLabel = (value: string | null) => {
    if (!value) return 'Member';
    return USER_ROLES.find(r => r.value === value)?.label || value;
  };
  const hasLegacyDepartment = (m: Member) => !!m.department && m.department !== 'general';
  const hasLegacyLevel = (m: Member) => !!m.level && m.level !== '0';

  const filteredMembers = members.filter(member => {
    const query = searchQuery.toLowerCase();
    return (
      member.full_name.toLowerCase().includes(query) ||
      (hasLegacyDepartment(member) && getDepartmentLabel(member.department).toLowerCase().includes(query)) ||
      (member.reg_number?.toLowerCase().includes(query)) ||
      (member.faculty?.toLowerCase().includes(query)) ||
      (member.system_id?.toLowerCase().includes(query))
    );
  });

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Member Directory" showBack />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Member Directory" subtitle={`${members.length} registered members`} showBack />

      <div className="px-4 py-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input placeholder="Search by name or ID..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} className="pl-12 rounded-full h-12" />
        </div>

        <div className="space-y-3">
          {filteredMembers.map((member) => (
            <Card key={member.id} className="p-4 shadow-soft">
              <div className="flex items-start gap-3">
                <Avatar className="w-12 h-12 ring-2 ring-border">
                  {member.avatar_url ? (
                    <AvatarImage src={member.avatar_url} />
                  ) : (
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                      {member.full_name.charAt(0)}
                    </AvatarFallback>
                  )}
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold">
                      {member.full_name}
                      {member.display_number > 1 && <span className="text-muted-foreground">#{member.display_number}</span>}
                    </p>
                    {member.user_role && member.user_role !== 'student' && (
                      <Badge variant="secondary" className="text-xs">{getRoleLabel(member.user_role)}</Badge>
                    )}
                    {member.is_anonymous && <Badge variant="outline" className="text-xs">Anonymous</Badge>}
                  </div>

                  {/* System ID - visible to admin */}
                  {member.system_id && (
                    <div className="mt-1">
                      <CopyableId id={member.system_id} prefix="" />
                    </div>
                  )}

                  {(hasLegacyDepartment(member) || hasLegacyLevel(member) || member.gender) && (
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {hasLegacyDepartment(member) && (
                        <Badge variant="secondary" className="text-xs">{getDepartmentLabel(member.department)}</Badge>
                      )}
                      {hasLegacyLevel(member) && (
                        <Badge variant="outline" className="text-xs">{getLevelLabel(member.level)}</Badge>
                      )}
                      {member.gender && <Badge variant="outline" className="text-xs capitalize">{member.gender}</Badge>}
                    </div>
                  )}

                  {member.reg_number && (
                    <p className="text-xs text-muted-foreground mt-1">Reg: {member.reg_number}</p>
                  )}

                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <Calendar className="w-3 h-3" />
                    <span>Joined {format(new Date(member.created_at), 'MMM d, yyyy')}</span>
                  </div>
                </div>

                <Button size="icon" variant="ghost" className="rounded-full shrink-0"
                  onClick={() => navigate(`/chat/private/${member.user_id}`)}>
                  <MessageCircle className="w-5 h-5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {filteredMembers.length === 0 && (
          <Card className="p-8 text-center">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No members found</h3>
            <p className="text-muted-foreground">Try a different search term</p>
          </Card>
        )}
      </div>
    </div>
  );
}
