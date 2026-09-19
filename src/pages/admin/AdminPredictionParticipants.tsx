 import { useState, useEffect } from 'react';
 import { useNavigate } from 'react-router-dom';
 import { Users, ChevronDown, ChevronUp, Target } from 'lucide-react';
 import { PageHeader } from '@/components/layout/PageHeader';
 import { Card } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
 import { useAdmin } from '@/hooks/useAdmin';
 import { useAuth } from '@/contexts/AuthContext';
 import { supabase } from '@/integrations/supabase/client';
 import { formatDistanceToNow } from 'date-fns';
 
 interface Event {
   id: string;
   title: string;
   is_resolved: boolean;
   correct_option: number | null;
   options: { text: string }[];
   created_at: string;
 }
 
 interface Prediction {
   id: string;
   user_id: string;
   selected_option: number;
   is_correct: boolean | null;
   created_at: string;
   profiles?: {
     full_name: string;
   };
 }
 
 export default function AdminPredictionParticipants() {
   const navigate = useNavigate();
   const { isAdmin, loading: roleLoading } = useAdmin();
   const { user, loading: authLoading } = useAuth();
   const [events, setEvents] = useState<Event[]>([]);
   const [predictions, setPredictions] = useState<Record<string, Prediction[]>>({});
   const [loading, setLoading] = useState(true);
   const [openEvents, setOpenEvents] = useState<string[]>([]);
 
   useEffect(() => {
     if (!authLoading && !user) navigate('/auth');
     if (!roleLoading && !isAdmin) navigate('/');
   }, [user, isAdmin, authLoading, roleLoading, navigate]);
 
   useEffect(() => {
     if (isAdmin) fetchEvents();
   }, [isAdmin]);
 
   const fetchEvents = async () => {
     const { data: eventsData } = await supabase
       .from('events')
       .select('id, title, is_resolved, correct_option, options, created_at')
       .order('created_at', { ascending: false });
 
     if (eventsData) {
       setEvents(eventsData as Event[]);
     }
     setLoading(false);
   };
 
   const fetchPredictions = async (eventId: string) => {
     if (predictions[eventId]) return;
 
     const { data } = await supabase
       .from('predictions')
       .select('id, user_id, selected_option, is_correct, created_at')
       .eq('event_id', eventId);
 
     if (data && data.length > 0) {
       const userIds = data.map(p => p.user_id);
       const { data: profiles } = await supabase
         .from('profiles')
         .select('user_id, full_name')
         .in('user_id', userIds);
 
       const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
       const enrichedPredictions = data.map(p => ({
         ...p,
         profiles: profileMap.get(p.user_id),
       }));
 
       setPredictions(prev => ({ ...prev, [eventId]: enrichedPredictions }));
     } else {
       setPredictions(prev => ({ ...prev, [eventId]: [] }));
     }
   };
 
   const toggleEvent = (eventId: string) => {
     if (openEvents.includes(eventId)) {
       setOpenEvents(prev => prev.filter(id => id !== eventId));
     } else {
       setOpenEvents(prev => [...prev, eventId]);
       fetchPredictions(eventId);
     }
   };
 
   if (authLoading || roleLoading || !isAdmin) {
     return (
       <div className="min-h-screen bg-background flex items-center justify-center">
         <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
       </div>
     );
   }
 
   return (
     <div className="min-h-screen bg-background">
       <PageHeader 
         title="Prediction Participants" 
         subtitle="View who predicted on each event"
         showBack
       />
 
       <div className="px-4 py-4 space-y-4">
         {loading ? (
           <div className="space-y-3">
             {[1, 2, 3].map((i) => (
               <Card key={i} className="p-4 animate-pulse">
                 <div className="w-3/4 h-5 bg-muted rounded" />
               </Card>
             ))}
           </div>
         ) : events.length === 0 ? (
           <Card className="p-8 text-center">
             <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
             <h3 className="font-semibold text-lg mb-2">No prediction events</h3>
             <p className="text-muted-foreground">No events have been created yet</p>
           </Card>
         ) : (
           events.map((event) => (
             <Collapsible
               key={event.id}
               open={openEvents.includes(event.id)}
               onOpenChange={() => toggleEvent(event.id)}
             >
               <Card className="shadow-soft overflow-hidden">
                 <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                   <div className="flex items-center gap-3">
                     <Target className="w-5 h-5 text-warning" />
                     <div className="text-left">
                       <h3 className="font-semibold">{event.title}</h3>
                       <p className="text-xs text-muted-foreground">
                         {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                       </p>
                     </div>
                   </div>
                   <div className="flex items-center gap-2">
                     {event.is_resolved && (
                       <Badge variant="secondary">Resolved</Badge>
                     )}
                     {openEvents.includes(event.id) ? (
                       <ChevronUp className="w-5 h-5 text-muted-foreground" />
                     ) : (
                       <ChevronDown className="w-5 h-5 text-muted-foreground" />
                     )}
                   </div>
                 </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t p-4 space-y-2">
                      {!predictions[event.id] ? (
                        <div className="animate-pulse space-y-2">
                          <div className="h-4 bg-muted rounded w-1/2" />
                          <div className="h-4 bg-muted rounded w-1/3" />
                        </div>
                      ) : predictions[event.id].length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No predictions yet
                        </p>
                      ) : (
                        <div className="space-y-4">
                          {/* Summary Stats */}
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="p-2 rounded-lg bg-muted">
                              <p className="text-lg font-bold">{predictions[event.id].length}</p>
                              <p className="text-xs text-muted-foreground">Total</p>
                            </div>
                            <div className="p-2 rounded-lg bg-primary/10">
                              <p className="text-lg font-bold text-primary">
                                {predictions[event.id].filter(p => p.selected_option === 0).length}
                              </p>
                              <p className="text-xs text-muted-foreground">Option 1</p>
                            </div>
                            <div className="p-2 rounded-lg bg-secondary/10">
                              <p className="text-lg font-bold text-secondary">
                                {predictions[event.id].filter(p => p.selected_option === 1).length}
                              </p>
                              <p className="text-xs text-muted-foreground">Option 2</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Users className="w-4 h-4" />
                            <span>{predictions[event.id].length} participants</span>
                          </div>
                          
                          {predictions[event.id].map((pred) => (
                            <div 
                              key={pred.id} 
                              className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                            >
                              <span className="font-medium text-sm">
                                {pred.profiles?.full_name || 'Unknown'}
                              </span>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={pred.selected_option === 0 ? 'border-primary text-primary' : 'border-secondary text-secondary'}>
                                  Option {pred.selected_option + 1}: {(event.options[pred.selected_option] as any)?.text || 'N/A'}
                                </Badge>
                                {pred.is_correct !== null && (
                                  <Badge variant={pred.is_correct ? 'default' : 'destructive'}>
                                    {pred.is_correct ? '✓ Correct' : '✗ Wrong'}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
               </Card>
             </Collapsible>
           ))
         )}
       </div>
     </div>
   );
 }