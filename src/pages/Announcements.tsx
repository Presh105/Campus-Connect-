import { useState, useEffect } from 'react';
import { Megaphone, Pin, Plus, Image, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { RulesBanner } from '@/components/rules/RulesBanner';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ImageUpload } from '@/components/ImageUpload';

interface Announcement {
  id: string;
  title: string;
  content: string | null;
  image_url: string | null;
  is_pinned: boolean;
  created_at: string;
}

export default function Announcements() {
  const { user, profile } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: '',
    content: '',
    image_url: ''
  });

  // Check if user is official (has official badge)
  const [isOfficial, setIsOfficial] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
    checkOfficialStatus();
  }, [user]);

  const checkOfficialStatus = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('is_official')
      .eq('user_id', user.id)
      .single();
    
    setIsOfficial(data?.is_official || false);
  };

  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from('school_announcements')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });
    
    setAnnouncements(data || []);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!user || !form.title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    setCreating(true);
    const { error } = await supabase
      .from('school_announcements')
      .insert({
        title: form.title.trim(),
        content: form.content.trim() || null,
        image_url: form.image_url || null,
        created_by: user.id,
        is_pinned: false
      });

    if (error) {
      toast.error('Failed to create announcement');
    } else {
      toast.success('Announcement posted!');
      setForm({ title: '', content: '', image_url: '' });
      setShowCreateDialog(false);
      fetchAnnouncements();
    }
    setCreating(false);
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-background pb-20">
        <PageHeader 
          title="Announcements" 
          subtitle="School memos and notices"
          action={
            isOfficial && (
              <Button 
                size="sm" 
                className="rounded-full bg-gradient-primary shadow-primary"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Post
              </Button>
            )
          }
        />

        <RulesBanner location="announcements" />

        <div className="px-4 py-4 space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Card key={i} className="animate-pulse">
                  <div className="w-full h-40 bg-muted" />
                  <div className="p-4 space-y-2">
                    <div className="w-3/4 h-5 bg-muted rounded" />
                    <div className="w-1/2 h-4 bg-muted rounded" />
                  </div>
                </Card>
              ))}
            </div>
          ) : announcements.length === 0 ? (
            <Card className="p-8 text-center">
              <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">No announcements</h3>
              <p className="text-muted-foreground">Check back later for school updates</p>
            </Card>
          ) : (
            announcements.map((announcement) => (
              <Card key={announcement.id} className="shadow-soft overflow-hidden">
                {announcement.image_url && (
                  <img 
                    src={announcement.image_url} 
                    alt={announcement.title}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {announcement.is_pinned && (
                      <Badge variant="secondary" className="text-xs">
                        <Pin className="w-3 h-3 mr-1" />
                        Pinned
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-lg">{announcement.title}</h3>
                  {announcement.content && (
                    <p className="text-muted-foreground mt-2">{announcement.content}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-3">
                    {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                  </p>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Create Announcement Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Post Announcement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Announcement title..."
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  maxLength={200}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Content (optional)</Label>
                <Textarea
                  id="content"
                  placeholder="Add more details..."
                  value={form.content}
                  onChange={(e) => setForm(prev => ({ ...prev, content: e.target.value }))}
                  maxLength={5000}
                />
              </div>
              <div className="space-y-2">
                <Label>Image (optional)</Label>
                {user && form.image_url ? (
                  <div className="relative">
                    <img src={form.image_url} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => setForm(prev => ({ ...prev, image_url: '' }))}
                    >
                      Remove
                    </Button>
                  </div>
                ) : user && (
                  <ImageUpload
                    bucket="posts"
                    userId={user.id}
                    onUpload={(url) => setForm(prev => ({ ...prev, image_url: url }))}
                    preview
                  />
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={creating || !form.title.trim()}>
                {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Post Announcement
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
