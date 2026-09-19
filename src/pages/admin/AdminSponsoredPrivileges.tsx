import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Crown, Trash2, Edit2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';

interface Privilege {
  id: string;
  user_id: string;
  days_allowed: number;
  posts_allowed: number;
  posts_used: number;
  expires_at: string | null;
  created_at: string;
  profiles?: {
    full_name: string;
    display_number: number;
  };
}

interface Profile {
  user_id: string;
  full_name: string;
  display_number: number;
}

export default function AdminSponsoredPrivileges() {
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useAdmin();
  const { user, loading: authLoading } = useAuth();
  const [privileges, setPrivileges] = useState<Privilege[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPrivilege, setEditingPrivilege] = useState<Privilege | null>(null);
  const [form, setForm] = useState({ 
    user_id: '', 
    days_allowed: 7, 
    posts_allowed: 1 
  });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter profiles based on search
  const filteredProfiles = profiles.filter(p => 
    p.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    // Fetch privileges
    const { data: privData, error: privError } = await supabase
      .from('sponsored_post_privileges')
      .select('*')
      .order('created_at', { ascending: false });

    // Fetch all profiles for selection
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('user_id, full_name, display_number')
      .order('full_name');

    if (!privError && privData && profilesData) {
      const profilesMap = new Map(profilesData.map(p => [p.user_id, p]));
      const privilegesWithProfiles = privData.map(priv => ({
        ...priv,
        profiles: profilesMap.get(priv.user_id)
      }));
      setPrivileges(privilegesWithProfiles);
      setProfiles(profilesData);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.user_id) {
      toast.error('Please select a user');
      return;
    }

    setSaving(true);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + form.days_allowed);

    if (editingPrivilege) {
      const { error } = await supabase
        .from('sponsored_post_privileges')
        .update({
          days_allowed: form.days_allowed,
          posts_allowed: form.posts_allowed,
          expires_at: expiresAt.toISOString(),
        })
        .eq('id', editingPrivilege.id);

      if (error) {
        toast.error('Failed to update privilege');
      } else {
        toast.success('Privilege updated');
        fetchData();
      }
    } else {
      const { error } = await supabase
        .from('sponsored_post_privileges')
        .insert({
          user_id: form.user_id,
          days_allowed: form.days_allowed,
          posts_allowed: form.posts_allowed,
          expires_at: expiresAt.toISOString(),
          assigned_by: user?.id,
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('This user already has a privilege');
        } else {
          toast.error('Failed to assign privilege');
        }
      } else {
        toast.success('Privilege assigned');
        fetchData();
      }
    }

    setSaving(false);
    setIsDialogOpen(false);
    setEditingPrivilege(null);
    setForm({ user_id: '', days_allowed: 7, posts_allowed: 1 });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { error } = await supabase
      .from('sponsored_post_privileges')
      .delete()
      .eq('id', deleteId);

    if (error) {
      toast.error('Failed to revoke privilege');
    } else {
      toast.success('Privilege revoked');
      fetchData();
    }
    setDeleting(false);
    setDeleteId(null);
  };

  const openEditDialog = (priv: Privilege) => {
    setEditingPrivilege(priv);
    setForm({ 
      user_id: priv.user_id, 
      days_allowed: priv.days_allowed, 
      posts_allowed: priv.posts_allowed 
    });
    setIsDialogOpen(true);
  };

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
        title="Sponsored Privileges" 
        subtitle="Assign sponsored post access"
        showBack
        action={
          <Button 
            size="sm" 
            className="rounded-full"
            onClick={() => {
              setEditingPrivilege(null);
              setForm({ user_id: '', days_allowed: 7, posts_allowed: 1 });
              setIsDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            Assign
          </Button>
        }
      />

      <div className="px-4 py-4 space-y-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="w-3/4 h-5 bg-muted rounded mb-2" />
                <div className="w-1/2 h-4 bg-muted rounded" />
              </Card>
            ))}
          </div>
        ) : privileges.length === 0 ? (
          <Card className="p-8 text-center">
            <Crown className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No privileges assigned</h3>
            <p className="text-muted-foreground">Assign sponsored post privileges to users</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {privileges.map((priv) => (
              <Card key={priv.id} className="p-4 shadow-soft">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h3 className="font-semibold">
                      {priv.profiles?.full_name || 'Unknown User'}
                      {priv.profiles?.display_number && priv.profiles.display_number > 1 && 
                        `#${priv.profiles.display_number}`
                      }
                    </h3>
                    <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                      <p>Posts: {priv.posts_used} / {priv.posts_allowed} used</p>
                      <p>Duration: {priv.days_allowed} days</p>
                      {priv.expires_at && (
                        <p>Expires: {format(new Date(priv.expires_at), 'MMM d, yyyy')}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      size="icon" 
                      variant="ghost"
                      onClick={() => openEditDialog(priv)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost"
                      onClick={() => setDeleteId(priv.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingPrivilege ? 'Edit Privilege' : 'Assign Sponsored Privilege'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {!editingPrivilege && (
                <div className="space-y-2">
                  <Label htmlFor="user">Search & Select User</Label>
                  <Input
                    placeholder="Type to search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="mb-2"
                  />
                  <Select
                    value={form.user_id}
                    onValueChange={(value) => setForm(prev => ({ ...prev, user_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredProfiles.map((profile) => (
                        <SelectItem key={profile.user_id} value={profile.user_id}>
                          {profile.full_name}
                          {profile.display_number > 1 && `#${profile.display_number}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="days">Number of Days</Label>
                <Input
                  id="days"
                  type="number"
                  min="1"
                  max="365"
                  value={form.days_allowed}
                  onChange={(e) => setForm(prev => ({ ...prev, days_allowed: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="posts">Number of Sponsored Posts</Label>
                <Input
                  id="posts"
                  type="number"
                  min="1"
                  max="100"
                  value={form.posts_allowed}
                  onChange={(e) => setForm(prev => ({ ...prev, posts_allowed: parseInt(e.target.value) || 1 }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <DeleteConfirmDialog
          open={!!deleteId}
          onOpenChange={(open) => !open && setDeleteId(null)}
          onConfirm={handleDelete}
          title="Revoke this privilege?"
          description="This will remove the user's ability to create sponsored posts."
          loading={deleting}
        />
      </div>
    </div>
  );
}
