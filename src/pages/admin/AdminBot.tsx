import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Bot, Play } from 'lucide-react';

export default function AdminBot() {
  const [enabled, setEnabled] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [count, setCount] = useState(0);

  const load = async () => {
    const { data } = await (supabase.from('bot_settings') as any).select('*').eq('id', 1).maybeSingle();
    if (data) { setEnabled(!!data.enabled); setLastRun(data.last_run_at); }
    const { count: c } = await (supabase.from('posts') as any).select('*', { count: 'exact', head: true }).eq('is_bot_post', true);
    setCount(c || 0);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggle = async (v: boolean) => {
    setEnabled(v);
    const { error } = await (supabase.from('bot_settings') as any).update({ enabled: v, updated_at: new Date().toISOString() }).eq('id', 1);
    if (error) { toast.error('Failed to update'); setEnabled(!v); }
    else toast.success(v ? 'Bot turned ON — posting every 5 minutes' : 'Bot turned OFF');
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bot-autopost`;
      const res = await fetch(url, { method: 'POST', headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` } });
      const j = await res.json().catch(() => ({}));
      if (j.ok) toast.success(`Posted: ${j.category}`);
      else toast.error(j.error || j.skipped || 'Failed');
      load();
    } finally { setRunning(false); }
  };

  return (
    <AppLayout>
      <PageHeader title="Auto-Post Bot" subtitle="AI-generated engagement posts" showBack />
      <div className="px-4 py-4 space-y-4">
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Assistant auto-poster</h3>
              <p className="text-xs text-muted-foreground">Posts anonymous content every 5 minutes: news, motivation, stories, money tips, discussion starters.</p>
            </div>
            <Switch checked={enabled} onCheckedChange={toggle} disabled={loading} />
          </div>
          <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
            <Badge variant={enabled ? 'default' : 'secondary'}>{enabled ? 'Active' : 'Paused'}</Badge>
            <span>Last run: {lastRun ? new Date(lastRun).toLocaleString() : 'Never'}</span>
            <span>· Bot posts so far: <strong>{count}</strong></span>
          </div>
          <Button onClick={runNow} disabled={running} className="w-full rounded-xl" variant="outline">
            <Play className="w-4 h-4 mr-2" /> {running ? 'Posting…' : 'Post one now'}
          </Button>
        </Card>
        <Card className="p-4 text-xs text-muted-foreground space-y-1">
          <p>• Posts appear in the main feed as anonymous (Someone), exactly like normal posts — with vote, comment, post ID and live view counts.</p>
          <p>• Toggle off any time to pause; toggling on resumes the 5-minute schedule.</p>
        </Card>
      </div>
    </AppLayout>
  );
}
