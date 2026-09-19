import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Plus, Trash2, ListPlus, Clock } from 'lucide-react';

interface QueueItem { id: string; title: string; content: string; posted: boolean; posted_at: string | null; created_at: string; }

export default function AdminBotQueue() {
  const { user } = useAuth();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [bulk, setBulk] = useState('');
  const [interval, setIntervalMin] = useState(5);
  const [queueOnly, setQueueOnly] = useState(false);

  const load = async () => {
    const { data } = await (supabase.from('bot_post_queue') as any).select('*').order('created_at', { ascending: false });
    setItems(data || []);
    const { data: s } = await (supabase.from('bot_settings') as any).select('interval_minutes, queue_only').eq('id', 1).maybeSingle();
    if (s) { setIntervalMin(s.interval_minutes ?? 5); setQueueOnly(!!s.queue_only); }
  };
  useEffect(() => { load(); }, []);

  const addOne = async () => {
    if (!title.trim() || !content.trim()) { toast.error('Title and content required'); return; }
    const { error } = await (supabase.from('bot_post_queue') as any).insert({ title: title.trim(), content: content.trim(), created_by: user?.id });
    if (error) return toast.error(error.message);
    toast.success('Queued');
    setTitle(''); setContent(''); load();
  };

  const addBulk = async () => {
    // Each post separated by a blank line. First line of each block = title, rest = content.
    const blocks = bulk.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
    if (blocks.length === 0) { toast.error('Paste some posts first'); return; }
    const rows = blocks.map(b => {
      const lines = b.split('\n');
      const t = (lines.shift() || '').trim().slice(0, 180);
      const c = lines.join('\n').trim() || t;
      return { title: t, content: c, created_by: user?.id };
    });
    const { error } = await (supabase.from('bot_post_queue') as any).insert(rows);
    if (error) return toast.error(error.message);
    toast.success(`Queued ${rows.length} posts`);
    setBulk(''); load();
  };

  const remove = async (id: string) => {
    await (supabase.from('bot_post_queue') as any).delete().eq('id', id);
    load();
  };

  const saveSettings = async () => {
    const v = Math.max(1, Number(interval) || 5);
    const { error } = await (supabase.from('bot_settings') as any).update({ interval_minutes: v, queue_only: queueOnly, updated_at: new Date().toISOString() }).eq('id', 1);
    if (error) return toast.error(error.message);
    toast.success('Settings saved');
  };

  const pending = items.filter(i => !i.posted);
  const done = items.filter(i => i.posted);

  return (
    <AppLayout>
      <PageHeader title="Bot Post Queue" subtitle="Drop posts the bot will publish one at a time" showBack />
      <div className="px-4 py-4 space-y-4">
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /><h3 className="font-semibold">Schedule</h3></div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Interval (minutes)</Label>
              <Input type="number" min={1} value={interval} onChange={e => setIntervalMin(Number(e.target.value))} />
            </div>
            <div className="flex items-end justify-between border rounded-xl px-3 py-2">
              <div>
                <p className="text-sm font-medium">Queue only</p>
                <p className="text-[10px] text-muted-foreground">Skip AI when queue empty</p>
              </div>
              <Switch checked={queueOnly} onCheckedChange={setQueueOnly} />
            </div>
          </div>
          <Button onClick={saveSettings} className="w-full rounded-xl">Save schedule</Button>
        </Card>

        <Card className="p-4 space-y-3">
          <h3 className="font-semibold">Add one post</h3>
          <Input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
          <Textarea placeholder="Post content…" rows={4} value={content} onChange={e => setContent(e.target.value)} />
          <Button onClick={addOne} className="w-full rounded-xl"><Plus className="w-4 h-4 mr-1" /> Queue post</Button>
        </Card>

        <Card className="p-4 space-y-3">
          <h3 className="font-semibold">Bulk queue</h3>
          <p className="text-xs text-muted-foreground">Paste many posts. Separate posts with a blank line. First line of each block is the title.</p>
          <Textarea rows={10} value={bulk} onChange={e => setBulk(e.target.value)} placeholder={"Title one\nContent of post one…\n\nTitle two\nContent of post two…"} />
          <Button onClick={addBulk} className="w-full rounded-xl"><ListPlus className="w-4 h-4 mr-1" /> Queue all</Button>
        </Card>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Pending ({pending.length})</h3>
          </div>
          <div className="space-y-2">
            {pending.map(i => (
              <Card key={i.id} className="p-3 flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{i.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{i.content}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove(i.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </Card>
            ))}
            {pending.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Queue empty</p>}
          </div>
        </div>

        {done.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2">Posted ({done.length})</h3>
            <div className="space-y-2">
              {done.slice(0, 20).map(i => (
                <Card key={i.id} className="p-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">Posted</Badge>
                    <p className="font-medium text-sm truncate flex-1">{i.title}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{i.posted_at ? new Date(i.posted_at).toLocaleString() : ''}</p>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
