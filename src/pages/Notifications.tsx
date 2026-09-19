import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, MessageCircle, ThumbsUp, Eye, Check, CheckCheck, Copy, Gift } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  reference_id: string | null;
  reference_type: string | null;
  created_at: string;
}

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchNotifications();
  }, [user]);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setNotifications(data || []);
    setLoading(false);
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const handleNotificationClick = async (n: Notification) => {
    if (!n.is_read) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', n.id);
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
    }
    if (n.reference_type === 'post' && n.reference_id) navigate(`/post/${n.reference_id}`);
    else if (n.reference_type === 'listing' && n.reference_id) navigate(`/listing/${n.reference_id}`);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'comment': return MessageCircle;
      case 'like': case 'vote': return ThumbsUp;
      case 'view': return Eye;
      case 'monetization': return Gift;
      default: return Bell;
    }
  };

  // Extract airtime code if present in message (formatted like "code: XXXX")
  const extractCode = (message: string): string | null => {
    const m = message.match(/code:\s*([A-Z0-9\-]{6,})/i) || message.match(/\b(\d{10,16})\b/);
    return m ? m[1] : null;
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <AppLayout>
      <PageHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
        action={
          unreadCount > 0 ? (
            <Button size="sm" variant="outline" className="rounded-full" onClick={markAllRead}>
              <CheckCheck className="w-4 h-4 mr-1" /> Read All
            </Button>
          ) : undefined
        }
      />

      <div className="px-4 py-4 space-y-2">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Card key={i} className="p-4 animate-pulse"><div className="w-3/4 h-4 bg-muted rounded" /></Card>)}
          </div>
        ) : notifications.length === 0 ? (
          <Card className="p-8 text-center">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-bold text-lg mb-1 text-foreground">No notifications</h3>
            <p className="text-muted-foreground text-sm">You'll be notified when someone interacts with your content.</p>
          </Card>
        ) : (
          notifications.map(n => {
            const Icon = getIcon(n.type);
            const code = n.type === 'monetization' ? extractCode(n.message || '') : null;
            return (
              <Card
                key={n.id}
                className={`p-3 cursor-pointer transition-all hover:shadow-soft ${!n.is_read ? 'bg-primary/5 border-primary/20' : ''}`}
                onClick={() => handleNotificationClick(n)}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${!n.is_read ? 'bg-primary/10' : 'bg-muted'}`}>
                    <Icon className={`w-4 h-4 ${!n.is_read ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm ${!n.is_read ? 'font-semibold text-foreground' : 'text-foreground'}`}>{n.title}</p>
                      {!n.is_read && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-3">{n.message}</p>
                    {code && (
                      <button
                        onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(code); toast.success('Code copied!'); }}
                        className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-success/10 hover:bg-success/20 text-success font-mono text-sm font-semibold"
                      >
                        <Copy className="w-3 h-3" /> {code}
                      </button>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </AppLayout>
  );
}
