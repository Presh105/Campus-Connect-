import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, Award, User, CheckCircle2, AlertTriangle, Send, ShieldCheck, Loader2, ExternalLink, Eye, Trash2, MessageCircle } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, isPast } from 'date-fns';
import { toast } from 'sonner';
import { useContentView } from '@/hooks/useContentView';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { CopyableId } from '@/components/CopyableId';

interface Task {
  id: string;
  title: string;
  description: string;
  reward: string;
  image_url: string | null;
  image_urls: string[] | null;
  status: string;
  created_at: string;
  poster_id: string;
  acceptor_id: string | null;
  deadline: string | null;
  worker_notes: string | null;
  worker_submission_url: string | null;
  whatsapp_link: string | null;
  short_id: string | null;
  view_count: number;
  is_sponsored?: boolean;
  is_pinned?: boolean;
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export default function TaskDetail() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { isAdmin } = useAdmin();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingTask, setDeletingTask] = useState(false);
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [submitForm, setSubmitForm] = useState({ notes: '', submissionUrl: '' });

  useContentView('task', taskId);

  useEffect(() => {
    if (taskId) {
      fetchTask();
      checkApplication();
    }
  }, [taskId]);

  const fetchTask = async () => {
    const { data: taskData, error } = await supabase
      .from('tasks').select('*').eq('id', taskId).single();

    if (error || !taskData) { navigate('/tasks'); return; }

    const { data: profileData } = await supabase
      .from('profiles').select('user_id, full_name, avatar_url')
      .eq('user_id', taskData.poster_id).single();

    setTask({ ...taskData, profiles: profileData || undefined });
    setLoading(false);
  };

  const checkApplication = async () => {
    if (!user || !taskId) return;
    const { data } = await supabase
      .from('task_applications')
      .select('id')
      .eq('task_id', taskId)
      .eq('applicant_id', user.id)
      .single();
    setHasApplied(!!data);
  };

  const handleAcceptTask = async () => {
    if (!user || !task) return;

    // Point 14: Check if user already applied
    if (hasApplied) {
      toast.error('You have already applied for this task');
      return;
    }

    setSubmitting(true);
    
    // Point 13: Check if task already has an acceptor
    const { data: currentTask } = await supabase
      .from('tasks').select('acceptor_id, status').eq('id', task.id).single();
    
    if (currentTask?.acceptor_id || currentTask?.status !== 'open') {
      toast.error('This task has already been accepted by someone else');
      setSubmitting(false);
      setShowAcceptDialog(false);
      fetchTask();
      return;
    }

    // Create application and accept
    await supabase.from('task_applications').insert({ task_id: task.id, applicant_id: user.id, status: 'accepted' });

    const { error } = await supabase
      .from('tasks')
      .update({ acceptor_id: user.id, status: 'in_progress' })
      .eq('id', task.id);

    if (error) {
      toast.error('Failed to accept task');
    } else {
      toast.success('Task accepted! Complete it and submit for review.');
      setHasApplied(true);
      fetchTask();
    }
    setSubmitting(false);
    setShowAcceptDialog(false);
  };

  const handleSubmitTask = async () => {
    if (!user || !task) return;
    setSubmitting(true);
    const { error } = await supabase
      .from('tasks')
      .update({
        worker_notes: submitForm.notes,
        worker_submission_url: submitForm.submissionUrl || null,
        status: 'completed'
      })
      .eq('id', task.id);

    if (error) {
      toast.error('Failed to submit task');
    } else {
      toast.success('Task submitted! The poster will verify your work before payment is released.');
      fetchTask();
    }
    setSubmitting(false);
    setShowSubmitDialog(false);
  };

  const handleDeleteTask = async () => {
    if (!task) return;
    setDeletingTask(true);
    const { error } = await supabase.from('tasks').delete().eq('id', task.id);
    setDeletingTask(false);
    if (error) toast.error('Failed to delete task');
    else { toast.success('Task deleted'); navigate('/tasks'); }
    setShowDeleteDialog(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-success/10 text-success border-success/20';
      case 'in_progress': return 'bg-warning/10 text-warning border-warning/20';
      case 'completed': return 'bg-primary/10 text-primary border-primary/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!task) return null;

  const isOwnTask = task.poster_id === user?.id;
  const isAcceptor = task.acceptor_id === user?.id;
  const isExpired = task.deadline ? isPast(new Date(task.deadline)) : false;
  const canAccept = task.status === 'open' && !isOwnTask && user && !hasApplied && !isExpired;
  const canSubmit = task.status === 'in_progress' && isAcceptor;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Task Details" showBack action={
        (isAdmin || isOwnTask) ? (
          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="w-5 h-5" />
          </Button>
        ) : undefined
      } />

      <div className="px-4 py-4 space-y-4">
        {/* Point 9: Expired task warning */}
        {isExpired && task.status === 'open' && (
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              This task has passed its deadline and is expired. Moderators may remove it.
            </AlertDescription>
          </Alert>
        )}

        {/* Escrow Warning - Point 8 & 12 */}
        <Alert>
          <ShieldCheck className="w-4 h-4" />
          <AlertDescription>
            <strong>⚠️ Do NOT send money directly to individuals.</strong> Money must be sent to the app to protect both parties from scam. Payment is released only after task completion and approval. Connect is not responsible for offline incidents but will take action against scammers.
          </AlertDescription>
        </Alert>

        <Card className="p-4 shadow-soft">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Badge className={getStatusColor(task.status)}>
              {isExpired && task.status === 'open' ? 'Expired' : task.status.replace('_', ' ')}
            </Badge>
            {task.is_sponsored && <Badge className="bg-warning/10 text-warning border-warning/20">Sponsored</Badge>}
            {task.is_pinned && <Badge className="bg-primary/10 text-primary border-primary/20">Pinned</Badge>}
            {task.short_id && <Badge variant="outline" className="text-xs">ID: #{task.short_id}</Badge>}
          </div>

          <h1 className="font-display text-xl font-bold text-foreground">{task.title}</h1>
          
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}</span>
            <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{task.view_count || 0} views</span>
          </div>

          <div className="flex items-center gap-4 mt-4 py-3 px-4 bg-muted rounded-xl">
            <Award className="w-6 h-6 text-secondary" />
            <div>
              <p className="text-xs text-muted-foreground">Reward</p>
              <p className="font-bold text-lg text-foreground">{task.reward}</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t">
            <h3 className="font-semibold mb-2">Description</h3>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
              {task.description.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
                /^https?:\/\//.test(part) ? (
                  <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all" onClick={e => e.stopPropagation()}>{part}</a>
                ) : part
              )}
            </p>
          </div>

          {task.deadline && (
            <div className="mt-4 pt-4 border-t">
              <h3 className="font-semibold mb-2">Deadline</h3>
              <p className={`${isExpired ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                {new Date(task.deadline).toLocaleDateString('en-US', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
                {isExpired && ' (EXPIRED)'}
              </p>
            </div>
          )}

          {/* Images - Point 10/22: Show full images */}
          {(task.image_url || (task.image_urls && task.image_urls.length > 0)) && (
            <div className="mt-4 space-y-2">
              {task.image_url && (
                <div className="rounded-xl overflow-hidden">
                  <img src={task.image_url} alt="" className="w-full object-contain max-h-96" />
                </div>
              )}
              {task.image_urls?.map((url, idx) => (
                <div key={idx} className="rounded-xl overflow-hidden">
                  <img src={url} alt="" className="w-full object-contain max-h-96" />
                </div>
              ))}
            </div>
          )}

          {/* WhatsApp submission link - Point 14: Only show to accepted user */}
          {isAcceptor && task.whatsapp_link && (
            <div className="mt-4 pt-4 border-t">
              <h3 className="font-semibold mb-2">WhatsApp Submission Link</h3>
              <a href={task.whatsapp_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                <ExternalLink className="w-4 h-4" /> Open WhatsApp
              </a>
            </div>
          )}

          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`/profile/${task.poster_id}`)}
                className="flex items-center gap-3 flex-1 text-left"
              >
                <Avatar className="w-10 h-10 ring-2 ring-border">
                  <AvatarImage src={task.profiles?.avatar_url || undefined} />
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                    {task.profiles?.full_name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{task.profiles?.full_name || 'Task Poster'}</p>
                  <p className="text-xs text-muted-foreground">Posted this task · View profile</p>
                </div>
              </button>
              {!isOwnTask && (
                <Button
                  size="icon"
                  variant="outline"
                  className="rounded-full shrink-0"
                  onClick={() => navigate(`/chat/private/${task.poster_id}`)}
                >
                  <MessageCircle className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Worker Submission */}
        {task.status === 'completed' && task.worker_notes && (
          <Card className="p-4 shadow-soft border-success/20">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-5 h-5 text-success" />
              <h3 className="font-semibold">Submission</h3>
            </div>
            <p className="text-muted-foreground">{task.worker_notes}</p>
            {task.worker_submission_url && (
              <a href={task.worker_submission_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline mt-2 inline-block">
                View Attachment →
              </a>
            )}
          </Card>
        )}

        {/* Point 13: Show that task is taken */}
        {task.status !== 'open' && !isOwnTask && !isAcceptor && (
          <Alert>
            <AlertDescription>This task has already been accepted by another user.</AlertDescription>
          </Alert>
        )}

        {hasApplied && !isAcceptor && (
          <Alert>
            <AlertDescription>You have already applied for this task.</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {canAccept && (
            <Button onClick={() => setShowAcceptDialog(true)} className="w-full rounded-full bg-gradient-primary shadow-primary h-12">
              <CheckCircle2 className="w-4 h-4 mr-2" /> Accept This Task
            </Button>
          )}
          {canSubmit && (
            <Button onClick={() => setShowSubmitDialog(true)} className="w-full rounded-full bg-gradient-secondary shadow-secondary h-12">
              <Send className="w-4 h-4 mr-2" /> Submit Completed Work
            </Button>
          )}
          {task.short_id && (
            <div className="flex justify-center">
              <CopyableId id={task.short_id} />
            </div>
          )}
        </div>
      </div>

      {/* Accept Task Dialog */}
      <Dialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" /> Accept Task - Escrow Protection
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-foreground mb-1">This task uses Escrow Protection</p>
                    <p className="text-muted-foreground">
                      Money is held by the app. When you complete this task, submit your work for the poster to verify. 
                      Once approved, the reward will be released to you.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-foreground mb-1">⚠️ Warning</p>
                    <p className="text-muted-foreground">
                      Do NOT send money to any individual. Connect is not responsible for offline incidents but will try to take action against scammers.
                    </p>
                  </div>
                </div>
                <ul className="text-sm text-muted-foreground space-y-2 ml-4">
                  <li>• Complete the task as described</li>
                  <li>• Submit proof of completion</li>
                  <li>• Wait for poster verification</li>
                  <li>• Receive your reward after approval</li>
                </ul>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowAcceptDialog(false)}>Cancel</Button>
            <Button onClick={handleAcceptTask} disabled={submitting} className="bg-gradient-primary">
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Accept Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit Work Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Completed Work</DialogTitle>
            <DialogDescription>Describe what you did. The task poster will verify before payment is released.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Describe your work *</Label>
              <Textarea id="notes" placeholder="Explain what you did..." value={submitForm.notes} onChange={(e) => setSubmitForm(prev => ({ ...prev, notes: e.target.value }))} className="min-h-[100px]" maxLength={2000} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">Proof Link (optional)</Label>
              <Input id="url" placeholder="https://..." value={submitForm.submissionUrl} onChange={(e) => setSubmitForm(prev => ({ ...prev, submissionUrl: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmitTask} disabled={submitting || !submitForm.notes.trim()} className="bg-gradient-secondary">
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Submit for Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDeleteTask}
        title="Delete this task?"
        description="This will permanently remove the task. This cannot be undone."
        loading={deletingTask}
      />
    </div>
  );
    }
