import { useState, useEffect } from 'react';
import { Plus, Calendar, MapPin, Clock, User, Trash2, FileText, Pin } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { format, isPast, isFuture, isToday } from 'date-fns';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { RulesBanner } from '@/components/rules/RulesBanner';
import { ResourceUpload } from '@/components/resources/ResourceUpload';
import { ResourceList } from '@/components/resources/ResourceList';

interface SchoolEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  location: string | null;
  creator_id: string;
  approval_status: string;
  created_at: string;
  is_pinned?: boolean;
  profiles?: {
    full_name: string;
    display_number: number;
  };
}

export default function Events() {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState('events');
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const { data: eventsData, error } = await supabase
      .from('school_events')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('event_date', { ascending: true });

    if (error) {
      setLoading(false);
      return;
    }

    // Fetch profiles
    const creatorIds = [...new Set(eventsData.map(e => e.creator_id))];
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('user_id, full_name, display_number')
      .in('user_id', creatorIds);

    const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

    const eventsWithProfiles = eventsData.map(event => ({
      ...event,
      profiles: profilesMap.get(event.creator_id) || undefined
    }));

    setEvents(eventsWithProfiles);
    setLoading(false);
  };

  const handleDeleteEvent = async () => {
    if (!deleteEventId) return;
    setDeleting(true);
    const { error } = await supabase.from('school_events').delete().eq('id', deleteEventId);
    setDeleting(false);
    if (error) {
      toast.error('Failed to delete event');
    } else {
      toast.success('Event deleted');
      setEvents(prev => prev.filter(e => e.id !== deleteEventId));
    }
    setDeleteEventId(null);
  };

  const handlePinEvent = async (eventId: string, currentlyPinned: boolean) => {
    const { error } = await supabase
      .from('school_events')
      .update({ is_pinned: !currentlyPinned })
      .eq('id', eventId);

    if (error) {
      toast.error('Failed to update pin status');
    } else {
      toast.success(currentlyPinned ? 'Event unpinned' : 'Event pinned');
      setEvents(prev => prev.map(e => 
        e.id === eventId ? { ...e, is_pinned: !currentlyPinned } : e
      ));
    }
  };

  const getEventStatus = (date: string) => {
    const eventDate = new Date(date);
    if (isPast(eventDate) && !isToday(eventDate)) return 'past';
    if (isToday(eventDate)) return 'today';
    return 'upcoming';
  };

  const getStatusBadge = (status: string, approvalStatus: string) => {
    if (approvalStatus === 'pending') {
      return <Badge className="bg-warning/10 text-warning border-warning/20">Pending Approval</Badge>;
    }
    switch (status) {
      case 'past':
        return <Badge variant="secondary">Past</Badge>;
      case 'today':
        return <Badge className="bg-success/10 text-success border-success/20">Today!</Badge>;
      case 'upcoming':
        return <Badge className="bg-info/10 text-info border-info/20">Upcoming</Badge>;
      default:
        return null;
    }
  };

  const approvedEvents = events.filter(e => e.approval_status === 'approved');
  const myPendingEvents = events.filter(e => e.approval_status === 'pending' && e.creator_id === user?.id);

  return (
    <AppLayout>
      <PageHeader 
        title="School Events" 
        subtitle="Local happenings & resources"
        action={
          activeTab === 'events' ? (
            <Link to="/events/create">
              <Button size="sm" className="rounded-full bg-gradient-primary shadow-primary">
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </Link>
          ) : (
            <Button 
              size="sm" 
              className="rounded-full bg-gradient-primary shadow-primary"
              onClick={() => setShowUpload(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Upload
            </Button>
          )
        }
      />

      <RulesBanner location="events" />

      <div className="px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full mb-4">
            <TabsTrigger value="events" className="flex-1">
              <Calendar className="w-4 h-4 mr-2" />
              Events
            </TabsTrigger>
            <TabsTrigger value="resources" className="flex-1">
              <FileText className="w-4 h-4 mr-2" />
              Study Materials
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="space-y-4 mt-0">
            {/* My Pending Events */}
            {myPendingEvents.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Your Pending Events</h3>
                {myPendingEvents.map((event) => (
                  <Card key={event.id} className="p-4 shadow-soft border-warning/20">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="font-semibold text-foreground">{event.title}</h3>
                      <Badge className="bg-warning/10 text-warning border-warning/20">Pending</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Awaiting admin approval</p>
                  </Card>
                ))}
              </div>
            )}

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="p-4 animate-pulse">
                    <div className="w-3/4 h-5 bg-muted rounded mb-2" />
                    <div className="w-full h-4 bg-muted rounded mb-3" />
                    <div className="w-1/2 h-3 bg-muted rounded" />
                  </Card>
                ))}
              </div>
            ) : approvedEvents.length === 0 ? (
              <Card className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-display font-bold text-lg mb-2">No events yet</h3>
                <p className="text-muted-foreground mb-4">Be the first to share an upcoming event!</p>
                <Link to="/events/create">
                  <Button className="rounded-full bg-gradient-primary shadow-primary">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Event
                  </Button>
                </Link>
              </Card>
            ) : (
              <div className="space-y-4">
                {approvedEvents.map((event) => {
                  const status = getEventStatus(event.event_date);
                  
                  return (
                    <Card key={event.id} className={`p-4 shadow-soft ${status === 'past' ? 'opacity-60' : ''} ${event.is_pinned ? 'ring-2 ring-primary/50' : ''}`}>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          {event.is_pinned && (
                            <Pin className="w-4 h-4 text-primary fill-primary" />
                          )}
                          <h3 className="font-semibold text-foreground text-lg">{event.title}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(status, event.approval_status)}
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => handlePinEvent(event.id, !!event.is_pinned)}
                                className={`transition-colors ${event.is_pinned ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
                                title={event.is_pinned ? 'Unpin event' : 'Pin event'}
                              >
                                <Pin className={`w-4 h-4 ${event.is_pinned ? 'fill-current' : ''}`} />
                              </button>
                              <button
                                onClick={() => setDeleteEventId(event.id)}
                                className="text-destructive hover:text-destructive/80 transition-colors"
                                title="Delete event"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {event.description && (
                        <p className="text-muted-foreground text-sm mb-3">{event.description}</p>
                      )}

                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{format(new Date(event.event_date), 'MMM d, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{format(new Date(event.event_date), 'h:mm a')}</span>
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{event.location}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
                        <User className="w-3 h-3" />
                        <span>
                          Posted by {event.profiles?.full_name || 'Member'}
                          {event.profiles?.display_number && event.profiles.display_number > 1 && 
                            `#${event.profiles.display_number}`
                          }
                        </span>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="resources" className="space-y-4 mt-0">
            {showUpload ? (
              <ResourceUpload 
                onSuccess={() => {
                  setShowUpload(false);
                }}
                onCancel={() => setShowUpload(false)}
              />
            ) : (
              <ResourceList />
            )}
          </TabsContent>
        </Tabs>
      </div>

      <DeleteConfirmDialog
        open={!!deleteEventId}
        onOpenChange={(open) => !open && setDeleteEventId(null)}
        onConfirm={handleDeleteEvent}
        title="Delete this event?"
        description="This will permanently delete the event. This cannot be undone."
        loading={deleting}
      />
    </AppLayout>
  );
}
