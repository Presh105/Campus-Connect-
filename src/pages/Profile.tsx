import { useState, useEffect } from 'react';
import { Settings, LogOut, Edit2, Award, MessageSquare, Package, TrendingUp, Gamepad2, Eye, EyeOff, Save, Shield, Calendar, Crown } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { useNavigate } from 'react-router-dom';
import { DEPARTMENTS, LEVELS, USER_ROLES } from '@/lib/constants';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ImageUpload } from '@/components/ImageUpload';
import { format } from 'date-fns';
import { ThemeToggle } from '@/components/ThemeToggle';

interface Stats {
  posts: number;
  listings: number;
  predictions: number;
  gameHighScore: number;
}

interface ExtendedProfile {
  id: string;
  user_id: string;
  full_name: string;
  department: string;
  level: string;
  avatar_url: string | null;
  bio: string | null;
  points: number;
  is_anonymous: boolean;
  created_at: string;
  updated_at: string;
  user_role: string | null;
  display_number: number;
  reg_number: string | null;
  faculty: string | null;
  gender: string | null;
  system_id: string | null;
  has_corrected_details?: boolean;
}

export default function Profile() {
  const { user, profile, signOut, loading, refreshProfile } = useAuth();
  const { isAdmin, isSuperAdmin } = useAdmin();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({ posts: 0, listings: 0, predictions: 0, gameHighScore: 0 });
  const [extendedProfile, setExtendedProfile] = useState<ExtendedProfile | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: '', bio: '', avatar_url: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) { navigate('/auth'); }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) { fetchStats(); fetchExtendedProfile(); }
    if (profile) {
      setIsAnonymous(profile.is_anonymous ?? false);
      setEditForm({ full_name: profile.full_name, bio: profile.bio || '', avatar_url: profile.avatar_url || '' });
    }
  }, [user, profile]);

  const fetchExtendedProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
    if (data) setExtendedProfile(data as ExtendedProfile);
  };

  const fetchStats = async () => {
    const [postsRes, listingsRes, predictionsRes, gameRes] = await Promise.all([
      supabase.from('posts').select('id', { count: 'exact' }).eq('user_id', user?.id),
      supabase.from('listings').select('id', { count: 'exact' }).eq('seller_id', user?.id),
      supabase.from('predictions').select('id', { count: 'exact' }).eq('user_id', user?.id),
      supabase.from('game_scores').select('score').eq('user_id', user?.id).order('score', { ascending: false }).limit(1),
    ]);
    setStats({
      posts: postsRes.count || 0,
      listings: listingsRes.count || 0,
      predictions: predictionsRes.count || 0,
      gameHighScore: gameRes.data?.[0]?.score || 0,
    });
  };

  const toggleAnonymous = async (value: boolean) => {
    if (!user) return;
    const { error } = await supabase.from('profiles').update({ is_anonymous: value }).eq('user_id', user.id);
    if (error) { toast.error('Failed to update privacy setting'); }
    else { setIsAnonymous(value); toast.success(value ? 'Profile is now anonymous' : 'Profile is now public'); refreshProfile(); }
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      full_name: editForm.full_name, bio: editForm.bio, avatar_url: editForm.avatar_url || null,
    }).eq('user_id', user.id);
    if (error) { toast.error('Failed to update profile'); }
    else { toast.success('Profile updated!'); setIsEditing(false); refreshProfile(); fetchExtendedProfile(); }
    setSaving(false);
  };

  const handleAvatarUpload = (url: string) => { setEditForm(prev => ({ ...prev, avatar_url: url })); };
  const getDepartmentLabel = (value: string) => DEPARTMENTS.find(d => d.value === value)?.label || value;
  const getRoleLabel = (value: string | null) => { if (!value) return null; return USER_ROLES.find(r => r.value === value)?.label || value; };
  const handleSignOut = async () => { await signOut(); navigate('/auth'); };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  if (!profile || !extendedProfile) return null;

  const roleLabel = getRoleLabel(extendedProfile.user_role);
  const displayName = `${extendedProfile.full_name}${extendedProfile.display_number > 1 ? `#${extendedProfile.display_number}` : ''}`;

  return (
    <AppLayout>
      <PageHeader 
        title="Profile" 
        action={
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate('/students')}>
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        }
      />

      <div className="px-4 py-4 space-y-4">
        <Card className={`p-6 shadow-soft text-center relative overflow-hidden ${isSuperAdmin ? 'ring-2 ring-warning' : ''}`}>
          <div className={`absolute inset-0 ${isSuperAdmin ? 'bg-gradient-to-br from-warning/20 to-primary/10' : 'bg-gradient-hero opacity-5'}`} />
          <div className="relative">
            {isSuperAdmin && (
              <div className="absolute -top-2 -right-2">
                <Badge className="bg-warning text-warning-foreground"><Crown className="w-3 h-3 mr-1" />Owner</Badge>
              </div>
            )}
            
            <Avatar className={`w-24 h-24 mx-auto ring-4 ${isSuperAdmin ? 'ring-warning' : 'ring-background'} shadow-elevated`}>
              <AvatarImage src={extendedProfile.avatar_url || undefined} />
              <AvatarFallback className={`text-2xl ${isSuperAdmin ? 'bg-gradient-to-br from-warning to-primary' : 'bg-gradient-primary'} text-primary-foreground`}>
                {extendedProfile.full_name.charAt(0)}
              </AvatarFallback>
            </Avatar>

            <h2 className="font-bold text-xl mt-4 text-foreground">{displayName}</h2>
            
            {roleLabel && extendedProfile.user_role !== 'student' && (
              <Badge className="mt-2 bg-primary/10 text-primary border-primary/20">{roleLabel}</Badge>
            )}
            
            <div className="flex items-center justify-center gap-2 mt-2">
              <Badge variant="secondary">{getDepartmentLabel(extendedProfile.department)}</Badge>
            </div>

            {extendedProfile.bio && (
              <p className="text-muted-foreground mt-3 text-sm">{extendedProfile.bio}</p>
            )}

            {/* System ID visible to the user themselves and admin */}
            {extendedProfile.system_id && (
              <div className="mt-3">
                <button
                  onClick={() => { navigator.clipboard.writeText(extendedProfile.system_id!); toast.success('System ID copied!'); }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full text-xs text-foreground hover:bg-muted/80 transition-colors"
                >
                  <Shield className="w-3 h-3" />
                  <span className="font-mono">{extendedProfile.system_id}</span>
                  <span className="text-[10px] opacity-60">Your ID</span>
                </button>
              </div>
            )}

            <div className="flex items-center justify-center gap-1 mt-3 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>Joined {format(new Date(extendedProfile.created_at), 'MMMM yyyy')}</span>
            </div>

            <button
              onClick={() => navigate('/withdraw')}
              className="inline-flex items-center justify-center gap-1 mt-4 px-4 py-2 rounded-full bg-warning/10 hover:bg-warning/20 transition-colors"
              title={extendedProfile.points >= 1000 ? 'Click to withdraw' : `Need ₦${1000 - extendedProfile.points} more to withdraw`}
            >
              <Award className="w-5 h-5 text-warning" />
              <span className="font-bold">₦{extendedProfile.points}</span>
              {extendedProfile.points >= 1000 && <span className="text-[10px] ml-1 px-2 py-0.5 rounded-full bg-warning text-warning-foreground font-semibold">Cash out</span>}
            </button>

            <Dialog open={isEditing} onOpenChange={setIsEditing}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="mt-4 rounded-full">
                  <Edit2 className="w-4 h-4 mr-2" />Edit Profile
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Edit Profile</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Profile Picture</Label>
                    {user && <ImageUpload bucket="avatars" userId={user.id} onUpload={handleAvatarUpload} preview />}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input id="full_name" value={editForm.full_name} onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea id="bio" value={editForm.bio} onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))} placeholder="Tell us about yourself..." />
                  </div>
                  <Button onClick={saveProfile} disabled={saving} className="w-full">
                    <Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </Card>

        {/* Privacy Settings */}
        <Card className="p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isAnonymous ? <EyeOff className="w-5 h-5 text-muted-foreground" /> : <Eye className="w-5 h-5 text-primary" />}
              <div>
                <p className="font-bold text-foreground">Anonymous Profile</p>
                <p className="text-xs text-muted-foreground">
                  {isAnonymous ? 'Your identity is hidden from other members' : 'Other members can see your profile'}
                </p>
              </div>
            </div>
            <Switch checked={isAnonymous} onCheckedChange={toggleAnonymous} />
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 shadow-soft">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.posts}</p>
                <p className="text-xs text-muted-foreground">Posts</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 shadow-soft">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.listings}</p>
                <p className="text-xs text-muted-foreground">Listings</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 shadow-soft">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-info/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.predictions}</p>
                <p className="text-xs text-muted-foreground">Predictions</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 shadow-soft">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                <Gamepad2 className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.gameHighScore}</p>
                <p className="text-xs text-muted-foreground">Game Best</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Admin Dashboard Link */}
        {isAdmin && (
          <Card 
            className={`p-4 shadow-soft cursor-pointer hover:shadow-elevated transition-shadow ${isSuperAdmin ? 'bg-gradient-to-r from-warning/20 to-primary/20' : 'bg-gradient-primary'} text-foreground`}
            onClick={() => navigate('/admin')}
          >
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6" />
              <div>
                <p className="font-bold">Admin Dashboard</p>
                <p className="text-sm opacity-90">Manage users, content & more</p>
              </div>
            </div>
          </Card>
        )}

        {/* Sign Out */}
        <Button variant="outline" className="w-full rounded-xl" onClick={handleSignOut}>
          <LogOut className="w-4 h-4 mr-2" />Sign Out
        </Button>
      </div>
    </AppLayout>
  );
}
