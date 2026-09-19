import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Play, Trophy, CheckCircle2, Eye, ExternalLink, Pause } from 'lucide-react';

interface VideoTask { id: string; title: string; url: string; embed_url: string; platform: string; required_seconds: number; points_reward: number; is_active: boolean; original_url: string | null; allow_rewatch: boolean; view_count: number; completion_count: number; }

export function WatchEarnTab() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<VideoTask[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<VideoTask | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false); // user pressed Play
  const intervalRef = useRef<number | null>(null);
  const claimedRef = useRef(false);

  const load = async () => {
    const { data } = await (supabase.from('video_tasks') as any).select('*').eq('is_active', true).order('created_at', { ascending: false });
    setTasks(data || []);
    if (user) {
      const { data: comps } = await (supabase.from('video_completions') as any).select('task_id').eq('user_id', user.id);
      setCompletedIds(new Set((comps || []).map((c: any) => c.task_id)));
    }
  };
  useEffect(() => { load(); }, [user]);

  // Pause when tab hidden / window blurred
  useEffect(() => {
    if (!active || !started) return;
    const onVis = () => setRunning(!document.hidden);
    const onBlur = () => setRunning(false);
    const onFocus = () => { if (!document.hidden) setRunning(true); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
    };
  }, [active, started]);

  useEffect(() => {
    if (!active) return;
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    if (running && started) {
      intervalRef.current = window.setInterval(() => setElapsed(e => e + 1), 1000);
    }
    return () => { if (intervalRef.current) window.clearInterval(intervalRef.current); };
  }, [running, started, active]);

  useEffect(() => {
    if (!active || claimedRef.current) return;
    if (elapsed >= active.required_seconds) {
      claimedRef.current = true;
      (async () => {
        const { data, error } = await (supabase as any).rpc('complete_video_task', { _task_id: active.id, _watched: elapsed });
        if (error) { toast.error(error.message || 'Could not credit points'); return; }
        if (data === 'awarded') toast.success(`+₦${active.points_reward} earned!`);
        else toast.message('Already completed');
        if (!active.allow_rewatch) setCompletedIds(s => new Set(s).add(active.id));
      })();
    }
  }, [elapsed, active]);

  const open = (t: VideoTask) => {
    if (completedIds.has(t.id) && !t.allow_rewatch) { toast.message('You already earned from this video.'); return; }
    claimedRef.current = false;
    setElapsed(0);
    setStarted(false);
    setRunning(false);
    setActive(t);
  };
  const close = () => { setActive(null); setElapsed(0); setStarted(false); setRunning(false); };

  const handlePlay = async () => {
    if (!active) return;
    setStarted(true);
    setRunning(true);
    // Register a view start
    try { await (supabase as any).rpc('register_video_view', { _task_id: active.id }); } catch {}
  };

  if (active) {
    const pct = Math.min(100, (elapsed / active.required_seconds) * 100);
    const done = elapsed >= active.required_seconds;
    const originalLink = active.original_url || active.url;
    return (
      <div className="space-y-3">
        <Card className="p-3 space-y-3">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-foreground">{active.title}</h3>
              <p className="text-xs text-muted-foreground">Watch {active.required_seconds}s to earn ₦{active.points_reward}</p>
            </div>
            <Button size="sm" variant="ghost" onClick={close}>Exit</Button>
          </div>
          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
            {started ? (
              <iframe
                src={active.embed_url}
                title={active.title}
                className="absolute inset-0 w-full h-full"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : (
              <button onClick={handlePlay} className="absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-2 bg-black/80 hover:bg-black/70 transition">
                <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-elevated">
                  <Play className="w-8 h-8 text-primary-foreground ml-1" />
                </div>
                <p className="text-white text-sm font-medium">Tap to play & start timer</p>
                <p className="text-white/60 text-xs">Timer only starts after you press play</p>
              </button>
            )}
          </div>
          {started && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>{running ? 'Counting…' : 'Paused (return to tab)'}</span>
                <span className="font-mono">{elapsed}s / {active.required_seconds}s</span>
              </div>
              <Progress value={pct} />
            </div>
          )}
          <div className="flex items-center gap-2">
            <a href={originalLink} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button variant="outline" size="sm" className="w-full rounded-xl">
                <ExternalLink className="w-4 h-4 mr-1" /> Open on {active.platform}
              </Button>
            </a>
            {started && (
              <Button size="sm" variant="ghost" onClick={() => setRunning(r => !r)}>
                {running ? <><Pause className="w-4 h-4 mr-1" /> Pause</> : <><Play className="w-4 h-4 mr-1" /> Resume</>}
              </Button>
            )}
          </div>
          {done ? (
            <Badge className="bg-success text-success-foreground w-full justify-center py-2"><CheckCircle2 className="w-4 h-4 mr-1" /> Reward credited</Badge>
          ) : started ? (
            <p className="text-[11px] text-muted-foreground text-center">Keep this tab visible. Timer pauses when you switch away.</p>
          ) : null}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Card className="p-3 bg-gradient-to-br from-primary/10 to-secondary/10">
        <div className="flex items-center gap-2"><Trophy className="w-5 h-5 text-primary" /><p className="font-semibold">Watch & Earn</p></div>
        <p className="text-xs text-muted-foreground mt-1">Press Play, watch the required seconds, and earn ₦ instantly. Timer starts only when you tap play.</p>
      </Card>
      {tasks.length === 0 && <p className="text-sm text-center text-muted-foreground py-8">No videos yet. Check back soon!</p>}
      {tasks.map(t => {
        const done = completedIds.has(t.id) && !t.allow_rewatch;
        const completion = t.view_count > 0 ? Math.round((t.completion_count / t.view_count) * 100) : 0;
        return (
          <Card key={t.id} className={`p-3 ${done ? 'opacity-60' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                {done ? <CheckCircle2 className="w-6 h-6 text-success" /> : <Play className="w-6 h-6 text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{t.title}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <Badge variant="secondary" className="text-[10px]">{t.platform}</Badge>
                  <span className="text-[11px] text-muted-foreground"><Eye className="w-3 h-3 inline" /> {t.required_seconds}s</span>
                  <Badge className="text-[10px]">+₦{t.points_reward}</Badge>
                  {t.allow_rewatch && <Badge variant="outline" className="text-[10px]">Rewatchable</Badge>}
                  {t.view_count > 0 && <span className="text-[10px] text-muted-foreground">{completion}% completion</span>}
                </div>
              </div>
              <Button size="sm" disabled={done} onClick={() => open(t)} className="rounded-xl">
                {done ? 'Done' : 'Watch'}
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
