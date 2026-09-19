import { useState, useEffect } from 'react';
import { Plus, Clock, Award, CheckCircle2, User, Sparkles, Trash2, Pin } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { RulesBanner } from '@/components/rules/RulesBanner';
import { CopyableId } from '@/components/CopyableId';

interface Task {
  id: string;
  title: string;
  description: string;
  reward: string;
  image_url: string | null;
  status: string;
  created_at: string;
  poster_id: string;
  acceptor_id: string | null;
  is_sponsored?: boolean;
  is_pinned?: boolean;
  short_id?: string | null;
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export default function Tasks() {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { fetchTasks(); }, []);

  const fetchTasks = async () => {
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks').select('*')
      .eq('approval_status', 'approved')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20);

    if (tasksError) { setLoading(false); return; }

    const posterIds = [...new Set(tasksData.map(t => t.poster_id))];
    const { data: profilesData } = await supabase
      .from('profiles').select('user_id, full_name, avatar_url')
      .in('user_id', posterIds);

    const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);
    setTasks(tasksData.map(task => ({ ...task, profiles: profilesMap.get(task.poster_id) || undefined })) as Task[]);
    setLoading(false);
  };

  const handleDeleteTask = async () => {
    if (!deleteTaskId) return;
    setDeleting(true);
    const { error } = await supabase.from('tasks').delete().eq('id', deleteTaskId);
    setDeleting(false);
    if (error) { toast.error('Failed to delete task'); }
    else { toast.success('Task deleted'); setTasks(prev => prev.filter(t => t.id !== deleteTaskId)); }
    setDeleteTaskId(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-success/10 text-success border-success/20';
      case 'in_progress': return 'bg-warning/10 text-warning border-warning/20';
      case 'completed': return 'bg-primary/10 text-primary border-primary/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <AppLayout>
      <PageHeader 
        title="Tasks" subtitle="Help others, earn rewards"
        action={<Link to="/create-task"><Button size="sm" className="rounded-full bg-gradient-secondary shadow-secondary"><Plus className="w-4 h-4 mr-1" /> New Task</Button></Link>}
      />
      <RulesBanner location="tasks" />

      <div className="px-4 py-4 space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="w-3/4 h-5 bg-muted rounded mb-2" />
                <div className="w-full h-4 bg-muted rounded mb-4" />
                <div className="w-24 h-8 bg-muted rounded" />
              </Card>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-display font-bold text-lg mb-2">No tasks available</h3>
            <p className="text-muted-foreground mb-4">Create a task for others to help with!</p>
            <Link to="/create-task"><Button className="rounded-full bg-gradient-secondary shadow-secondary"><Plus className="w-4 h-4 mr-2" /> Create Task</Button></Link>
          </Card>
        ) : (
          tasks.map((task) => {
            const canDelete = isAdmin || task.poster_id === user?.id;

            const handlePinTask = async (e: React.MouseEvent) => {
              e.stopPropagation();
              const { error } = await supabase.from('tasks').update({ is_pinned: !task.is_pinned }).eq('id', task.id);
              if (error) toast.error('Failed to update pin status');
              else { toast.success(task.is_pinned ? 'Task unpinned' : 'Task pinned'); fetchTasks(); }
            };

            return (
              <Card 
                key={task.id} 
                className={`p-4 shadow-soft animate-fade-in cursor-pointer ${task.is_pinned ? 'ring-2 ring-primary/50' : ''} ${task.is_sponsored ? 'ring-2 ring-warning/50' : ''}`}
                onClick={() => navigate(`/task/${task.id}`)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {task.is_pinned && <Badge className="bg-primary/10 text-primary border-primary/20"><Pin className="w-3 h-3 mr-1 fill-current" /> Pinned</Badge>}
                      <Badge className={getStatusColor(task.status)}>{task.status.replace('_', ' ')}</Badge>
                      {task.is_sponsored && <Badge className="bg-warning/10 text-warning border-warning/20"><Sparkles className="w-3 h-3 mr-1" /> Sponsored</Badge>}
                    </div>
                    <h3 className="font-semibold text-foreground text-lg">{task.title}</h3>
                    <p className="text-muted-foreground text-sm mt-1 line-clamp-2">{task.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-4 py-3 px-4 bg-muted rounded-xl">
                  <Award className="w-5 h-5 text-secondary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Reward</p>
                    <p className="font-semibold text-foreground">{task.reward}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={task.profiles?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs bg-muted">{task.profiles?.full_name?.charAt(0) || '?'}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground">{task.profiles?.full_name}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                    </span>
                    {task.short_id && <CopyableId id={task.short_id} />}
                  </div>

                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <button onClick={handlePinTask}
                        className={`transition-colors p-2 ${task.is_pinned ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
                        title={task.is_pinned ? 'Unpin task' : 'Pin task'}>
                        <Pin className={`w-4 h-4 ${task.is_pinned ? 'fill-current' : ''}`} />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTaskId(task.id); }}
                        className="text-destructive hover:text-destructive/80 transition-colors p-2"
                        title="Delete task">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      <DeleteConfirmDialog
        open={!!deleteTaskId}
        onOpenChange={(open) => !open && setDeleteTaskId(null)}
        onConfirm={handleDeleteTask}
        title="Delete this task?"
        description="This will permanently remove the task. This cannot be undone."
        loading={deleting}
      />
    </AppLayout>
  );
}
