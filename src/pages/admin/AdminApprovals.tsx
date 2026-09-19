import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, Clock, FileText, ShoppingBag, ClipboardList, MessageSquare, Calendar } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface PendingItem {
  id: string;
  type: 'post' | 'task' | 'listing' | 'prediction' | 'school_event';
  title: string;
  description: string;
  created_at: string;
  user_name: string;
  is_sponsored?: boolean;
  reward?: string;
  price?: number;
}

export default function AdminApprovals() {
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useAdmin();
  const { user, loading: authLoading } = useAuth();
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<PendingItem | null>(null);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
    if (!roleLoading && !isAdmin) navigate('/');
  }, [user, isAdmin, authLoading, roleLoading, navigate]);

  useEffect(() => { if (isAdmin) fetchPendingItems(); }, [isAdmin]);

  const fetchPendingItems = async () => {
    const items: PendingItem[] = [];

    // Fetch pending posts
    const { data: posts } = await supabase.from('posts').select('id, title, content, created_at, is_sponsored, user_id').eq('approval_status', 'pending');
    if (posts) {
      const userIds = posts.map(p => p.user_id);
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', userIds);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
      posts.forEach(post => items.push({ id: post.id, type: 'post', title: post.title, description: post.content, created_at: post.created_at, user_name: profileMap.get(post.user_id) || 'Unknown', is_sponsored: post.is_sponsored }));
    }

    // Fetch pending tasks
    const { data: tasks } = await supabase.from('tasks').select('id, title, description, created_at, reward, poster_id').eq('approval_status', 'pending');
    if (tasks) {
      const userIds = tasks.map(t => t.poster_id);
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', userIds);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
      tasks.forEach(task => items.push({ id: task.id, type: 'task', title: task.title, description: task.description, created_at: task.created_at, user_name: profileMap.get(task.poster_id) || 'Unknown', reward: task.reward }));
    }

    // Fetch pending listings (Point 18: all listings now go through approval)
    const { data: listings } = await supabase.from('listings').select('id, title, description, created_at, price, is_sponsored, seller_id').eq('approval_status', 'pending');
    if (listings) {
      const userIds = listings.map(l => l.seller_id);
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', userIds);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
      listings.forEach(listing => items.push({ id: listing.id, type: 'listing', title: listing.title, description: listing.description, created_at: listing.created_at, user_name: profileMap.get(listing.seller_id) || 'Unknown', is_sponsored: listing.is_sponsored, price: listing.price }));
    }

    // Fetch pending events
    const { data: events } = await supabase.from('events').select('id, title, description, created_at, requires_payment, creator_id').eq('approval_status', 'pending');
    if (events) {
      const userIds = events.filter(e => e.creator_id).map(e => e.creator_id!);
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', userIds);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
      events.forEach(event => items.push({ id: event.id, type: 'prediction', title: event.title, description: event.description || '', created_at: event.created_at, user_name: event.creator_id ? (profileMap.get(event.creator_id) || 'Unknown') : 'System', is_sponsored: event.requires_payment }));
    }

    // Fetch pending school events
    const { data: schoolEvents } = await supabase.from('school_events').select('id, title, description, created_at, creator_id').eq('approval_status', 'pending');
    if (schoolEvents) {
      const userIds = schoolEvents.map(e => e.creator_id);
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', userIds);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
      schoolEvents.forEach(event => items.push({ id: event.id, type: 'school_event', title: event.title, description: event.description || '', created_at: event.created_at, user_name: profileMap.get(event.creator_id) || 'Unknown' }));
    }

    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setPendingItems(items);
    setLoading(false);
  };

  const handleAction = async () => {
    if (!selectedItem || !action) return;
    setProcessing(true);

    const status = action === 'approve' ? 'approved' : 'rejected';
    const tableMap: Record<string, string> = {
      post: 'posts', task: 'tasks', listing: 'listings', prediction: 'events', school_event: 'school_events'
    };
    const table = tableMap[selectedItem.type];

    if (action === 'reject') {
      // Rejected items get deleted
      const { error } = await (supabase.from(table as any) as any).delete().eq('id', selectedItem.id);
      if (error) {
        toast.error(`Failed to reject ${selectedItem.type}`);
        if (import.meta.env.DEV) console.error(error);
      } else {
        toast.success(`${selectedItem.type} rejected and removed`);
        setPendingItems(prev => prev.filter(item => !(item.id === selectedItem.id && item.type === selectedItem.type)));
      }
    } else {
      // Approved items get status updated
      const updateData: any = { approval_status: status, admin_notes: adminNotes || null };
      if (selectedItem.type === 'task') updateData.payment_confirmed = true;

      const { error } = await (supabase.from(table as any) as any).update(updateData).eq('id', selectedItem.id);
      if (error) {
        toast.error(`Failed to approve ${selectedItem.type}`);
        if (import.meta.env.DEV) console.error(error);
      } else {
        toast.success(`${selectedItem.type} approved and moved to feed!`);
        setPendingItems(prev => prev.filter(item => !(item.id === selectedItem.id && item.type === selectedItem.type)));
      }
    }

    setProcessing(false);
    setSelectedItem(null);
    setAction(null);
    setAdminNotes('');
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'post': return MessageSquare;
      case 'task': return ClipboardList;
      case 'listing': return ShoppingBag;
      case 'prediction': return FileText;
      case 'school_event': return Calendar;
      default: return FileText;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'post': return 'bg-primary/10 text-primary';
      case 'task': return 'bg-secondary/10 text-secondary';
      case 'listing': return 'bg-success/10 text-success';
      case 'prediction': return 'bg-warning/10 text-warning';
      case 'school_event': return 'bg-info/10 text-info';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (authLoading || roleLoading || !isAdmin) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Content Approvals" subtitle={`${pendingItems.length} items pending review`} showBack />

      <div className="px-4 py-4 space-y-4">
        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => (<Card key={i} className="p-4 animate-pulse"><div className="w-3/4 h-5 bg-muted rounded mb-2" /><div className="w-full h-4 bg-muted rounded" /></Card>))}</div>
        ) : pendingItems.length === 0 ? (
          <Card className="p-8 text-center">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No pending approvals</h3>
            <p className="text-muted-foreground">All content has been reviewed</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {pendingItems.map((item) => {
              const Icon = getTypeIcon(item.type);
              return (
                <Card key={`${item.type}-${item.id}`} className="p-4 shadow-soft">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getTypeColor(item.type)}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs capitalize">{item.type.replace('_', ' ')}</Badge>
                        {item.is_sponsored && <Badge variant="secondary" className="text-xs">Sponsored</Badge>}
                      </div>
                      <h3 className="font-semibold truncate">{item.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span>By {item.user_name}</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
                        {item.reward && <Badge variant="outline">Reward: {item.reward}</Badge>}
                        {item.price && <Badge variant="outline">₦{item.price.toLocaleString()}</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" className="flex-1 rounded-full" onClick={() => { setSelectedItem(item); setAction('approve'); }}>
                      <Check className="w-4 h-4 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" className="flex-1 rounded-full" onClick={() => { setSelectedItem(item); setAction('reject'); }}>
                      <X className="w-4 h-4 mr-1" /> Reject
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <Dialog open={!!selectedItem && !!action} onOpenChange={() => { setSelectedItem(null); setAction(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{action === 'approve' ? 'Approve' : 'Reject'} {selectedItem?.type?.replace('_', ' ')}</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <p className="text-muted-foreground">You are about to {action} "<strong>{selectedItem?.title}</strong>"</p>
              <div className="space-y-2">
                <label className="text-sm font-medium">Admin Notes (optional)</label>
                <Textarea placeholder="Add notes or reason..." value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setSelectedItem(null); setAction(null); }}>Cancel</Button>
              <Button variant={action === 'approve' ? 'default' : 'destructive'} onClick={handleAction} disabled={processing}>
                {processing ? 'Processing...' : action === 'approve' ? 'Approve' : 'Reject'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
