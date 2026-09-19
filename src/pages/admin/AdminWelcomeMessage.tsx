import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Megaphone } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function AdminWelcomeMessage() {
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [messageId, setMessageId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('app_messages').select('*').eq('type', 'welcome').order('created_at', { ascending: false }).limit(1).single();
      if (data) {
        setTitle(data.title);
        setContent(data.content);
        setIsActive(data.is_active);
        setMessageId(data.id);
      }
    };
    fetch();
  }, []);

  const handleSave = async () => {
    if (!user || !title.trim() || !content.trim()) { toast.error('Fill in all fields'); return; }
    setSaving(true);
    if (messageId) {
      await supabase.from('app_messages').update({ title: title.trim(), content: content.trim(), is_active: isActive }).eq('id', messageId);
    } else {
      await supabase.from('app_messages').insert({ type: 'welcome', title: title.trim(), content: content.trim(), is_active: isActive, created_by: user.id });
    }
    toast.success('Welcome message saved!');
    setSaving(false);
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Welcome Message" subtitle="Shown when users open the app" showBack />
      <div className="px-4 py-4 space-y-4">
        <Card className="p-4 shadow-soft">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Welcome message title" className="rounded-xl h-12" />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write the message users see on sign in..." className="min-h-[120px]" />
            </div>
            <div className="flex items-center justify-between py-3 px-4 bg-muted rounded-xl">
              <div className="flex items-center gap-3">
                <Megaphone className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">Active</p>
                  <p className="text-xs text-muted-foreground">Show this message to users</p>
                </div>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>
        </Card>
        <Button onClick={handleSave} disabled={saving} className="w-full h-12 rounded-xl bg-gradient-primary">
          <Save className="w-4 h-4 mr-2" /> {saving ? 'Saving...' : 'Save Message'}
        </Button>
      </div>
    </div>
  );
}
