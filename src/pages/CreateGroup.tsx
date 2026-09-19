import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { GROUP_TYPES } from '@/lib/constants';
import { ImageUpload } from '@/components/ImageUpload';

export default function CreateGroup() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    visibility: 'public',
    group_type: 'social',
    allow_anonymous_posts: false,
    avatar_url: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name) {
      toast.error('Please enter a group name');
      return;
    }

    setLoading(true);

    // Create group
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({
        name: form.name,
        description: form.description,
        visibility: form.visibility as 'public' | 'private',
        group_type: form.group_type as 'social' | 'academic' | 'club' | 'official',
        allow_anonymous_posts: form.allow_anonymous_posts,
        avatar_url: form.avatar_url || null,
        creator_id: user?.id,
      })
      .select()
      .single();

    if (groupError) {
      toast.error('Failed to create group');
      setLoading(false);
      return;
    }

    // Add creator as admin member
    await supabase.from('group_members').insert({
      group_id: group.id,
      user_id: user?.id,
      role: 'admin',
      status: 'approved',
    });

    toast.success('Group created!');
    navigate(`/groups/${group.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        title="Create Group" 
        subtitle="Start a new community"
        showBack
      />

      <form onSubmit={handleSubmit} className="px-4 py-4 space-y-4">
        <Card className="p-4 space-y-4">
          {/* Group Avatar */}
          <div className="space-y-2">
            <Label>Group Image (optional)</Label>
            {user && (
              <ImageUpload
                bucket="avatars"
                userId={user.id}
                onUpload={(url) => setForm(prev => ({ ...prev, avatar_url: url }))}
                preview
              />
            )}
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Group Name *</Label>
            <Input
              id="name"
              placeholder="Enter group name"
              value={form.name}
              onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
              className="rounded-xl h-12"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What is this group about?"
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label>Group Type</Label>
            <Select value={form.group_type} onValueChange={(v) => setForm(prev => ({ ...prev, group_type: v }))}>
              <SelectTrigger className="rounded-xl h-12">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {GROUP_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Visibility */}
          <div className="space-y-2">
            <Label>Visibility</Label>
            <Select value={form.visibility} onValueChange={(v) => setForm(prev => ({ ...prev, visibility: v }))}>
              <SelectTrigger className="rounded-xl h-12">
                <SelectValue placeholder="Select visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public - Anyone can join</SelectItem>
                <SelectItem value="private">Private - Approval required</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Anonymous Posts */}
          <div className="flex items-center justify-between py-2">
            <div>
              <Label>Allow Anonymous Posts</Label>
              <p className="text-xs text-muted-foreground">Members can post anonymously</p>
            </div>
            <Switch
              checked={form.allow_anonymous_posts}
              onCheckedChange={(checked) => setForm(prev => ({ ...prev, allow_anonymous_posts: checked }))}
            />
          </div>
        </Card>

        <Button 
          type="submit" 
          disabled={loading}
          className="w-full h-12 rounded-xl bg-gradient-primary shadow-primary"
        >
          {loading ? 'Creating...' : 'Create Group'}
        </Button>
      </form>
    </div>
  );
}
