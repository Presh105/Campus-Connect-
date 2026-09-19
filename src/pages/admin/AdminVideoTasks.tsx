import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Trash2, Video, Plus } from 'lucide-react';
import { detectAndEmbed } from '@/lib/videoEmbed';

interface Task { id: string; title: string; url: string; platform: string; embed_url: string; required_seconds: number; points_reward: number; is_active: boolean; original_url: string | null; allow_rewatch: boolean; view_count: number; completion_count: number; }

export default function AdminVideoTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [originalUrl, setOriginalUrl] = useState('');
  const [seconds, setSeconds] = useState(30);
  const [points, setPoints] = useState(10);
  const [allowRewatch, setAllowRewatch] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await (supabase.from('video_tasks') as any).select('*').order('created_at', { ascending: false });
    setTasks(data || []);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!user) return;
    if (!title.trim() || !url.trim()) { toast.error('Title and link required'); return; }
    const { platform, embedUrl } = detectAndEmbed(url.trim());
    if (platform === 'unknown') { toast.error('Unsupported link. Use YouTube, TikTok, Instagram, Facebook, X, or Telegram.'); return; }
    setSaving(true);
    const { error } = await (supabase.from('video_tasks') as any).insert({
      created_by: user.id, title: title.trim(), url: url.trim(), platform, embed_url: embedUrl,
      required_seconds: Math.max(5, seconds), points_reward: Math.max(1, points), is_active: true,
      original_url: originalUrl.trim() || url.trim(),
      allow_rewatch: allowRewatch,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Video task published');
    setTitle(''); setUrl(''); setOriginalUrl(''); setAllowRewatch(false); load();
  };

  const toggle = async (t: Task) => {
    await (supabase.from('video_tasks') as any).update({ is_active: !t.is_active }).eq('id', t.id);
    load();
  };
  const toggleRewatch = async (t: Task) => {
    await (supabase.from('video_tasks') as any).update({ allow_rewatch: !t.allow_rewatch }).eq('id', t.id);
    load();
  };
  const remove = async (id: string) => {
    if (!confirm('Delete this video task?')) return;
    await (supabase.from('video_tasks') as any).delete().eq('id', id);
    load();
  };

  return (
    <AppLayout>
      <PageHeader title="Watch & Earn — Video Tasks" subtitle="Paste links only; we embed them" showBack />
      <div className="px-4 py-4 space-y-4">
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2"><Video className="w-5 h-5 text-primary" /><h3 className="font-semibold">New task</h3></div>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Watch our city tour" />
          </div>
          <div className="space-y-2">
            <Label>Embed link (YouTube / TikTok / Instagram / Facebook / X / Telegram)</Label>
            <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div className="space-y-2">
            <Label>Original link (where users can also open & interact)</Label>
            <Input value={originalUrl} onChange={e => setOriginalUrl(e.target.value)} placeholder="Defaults to embed link if left empty" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Required seconds</Label><Input type="number" min={5} value={seconds} onChange={e => setSeconds(Number(e.target.value))} /></div>
            <div><Label>Reward (₦)</Label><Input type="number" min={1} value={points} onChange={e => setPoints(Number(e.target.value))} /></div>
          </div>
          <div className="flex items-center justify-between border rounded-xl px-3 py-2">
            <div>
              <p className="text-sm font-medium">Allow rewatching</p>
              <p className="text-[11px] text-muted-foreground">Each user can earn from this video multiple times</p>
            </div>
            <Switch checked={allowRewatch} onCheckedChange={setAllowRewatch} />
          </div>
          <Button onClick={add} disabled={saving} className="w-full rounded-xl"><Plus className="w-4 h-4 mr-1" /> Publish video task</Button>
        </Card>

        <div className="space-y-2">
          {tasks.map(t => {
            const rate = t.view_count > 0 ? Math.round((t.completion_count / t.view_count) * 100) : 0;
            return (
              <Card key={t.id} className="p-3 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold truncate">{t.title}</p>
                      <Badge variant="secondary" className="text-[10px]">{t.platform}</Badge>
                      <Badge className="text-[10px]">₦{t.points_reward} · {t.required_seconds}s</Badge>
                      {t.allow_rewatch && <Badge variant="outline" className="text-[10px]">Rewatchable</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{t.url}</p>
                    <p className="text-[11px] text-muted-foreground">Views: {t.view_count} · Completions: {t.completion_count} · Completion rate: {rate}%</p>
                  </div>
                  <Switch checked={t.is_active} onCheckedChange={() => toggle(t)} />
                  <Button variant="ghost" size="icon" onClick={() => remove(t.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Allow rewatch</span>
                  <Switch checked={t.allow_rewatch} onCheckedChange={() => toggleRewatch(t)} />
                </div>
              </Card>
            );
          })}
          {tasks.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No video tasks yet.</p>}
        </div>
      </div>
    </AppLayout>
  );
}
