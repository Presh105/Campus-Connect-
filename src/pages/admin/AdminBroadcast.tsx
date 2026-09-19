import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Users } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LEVELS, DEPARTMENTS } from '@/lib/constants';

export default function AdminBroadcast() {
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetLevel, setTargetLevel] = useState('all');
  const [targetDepartment, setTargetDepartment] = useState('all');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!user || !title.trim() || !content.trim()) { toast.error('Fill in title and content'); return; }
    setSending(true);

    // Get target users
    let query = supabase.from('profiles').select('user_id');
    if (targetLevel !== 'all') query = query.eq('level', targetLevel as any);
    if (targetDepartment !== 'all') query = query.eq('department', targetDepartment);

    const { data: targetUsers } = await query;

    if (!targetUsers || targetUsers.length === 0) {
      toast.error('No users match this criteria');
      setSending(false);
      return;
    }

    // Create notifications for each user
    const notifications = targetUsers.map(u => ({
      user_id: u.user_id,
      type: 'broadcast',
      title: title.trim(),
      message: content.trim(),
    }));

    const { error } = await supabase.from('notifications').insert(notifications);

    // Also save as app message
    await supabase.from('app_messages').insert({
      type: 'broadcast',
      title: title.trim(),
      content: content.trim(),
      target_level: targetLevel === 'all' ? null : targetLevel,
      target_department: targetDepartment === 'all' ? null : targetDepartment,
      created_by: user.id,
    });

    if (error) {
      toast.error('Failed to send broadcast');
    } else {
      toast.success(`Broadcast sent to ${targetUsers.length} users!`);
      setTitle('');
      setContent('');
    }
    setSending(false);
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Broadcast Message" subtitle="Send messages to members" showBack />

      <div className="px-4 py-4 space-y-4">
        <Card className="p-4 shadow-soft">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Message title" className="rounded-xl h-12" maxLength={200} />
            </div>
            <div className="space-y-2">
              <Label>Message *</Label>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write your broadcast message..." className="min-h-[120px]" maxLength={5000} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Target Level</Label>
                <Select value={targetLevel} onValueChange={setTargetLevel}>
                  <SelectTrigger className="rounded-xl h-12"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    {LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target Department</Label>
                <Select value={targetDepartment} onValueChange={setTargetDepartment}>
                  <SelectTrigger className="rounded-xl h-12"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {DEPARTMENTS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </Card>

        <Button onClick={handleSend} disabled={sending} className="w-full h-12 rounded-xl bg-gradient-primary shadow-primary">
          <Send className="w-4 h-4 mr-2" /> {sending ? 'Sending...' : 'Send Broadcast'}
        </Button>
      </div>
    </div>
  );
}
