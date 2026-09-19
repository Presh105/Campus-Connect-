import { useState, useEffect } from 'react';
import { TrendingUp, Check, Clock, Trophy, Users, Plus, FileText, Gamepad2, Trash2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import { PREDICTION_TERMS } from '@/lib/predictionTerms';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { RulesBanner } from '@/components/rules/RulesBanner';
import { SectionAd } from '@/components/ads/SectionAd';

interface Event {
  id: string;
  title: string;
  description: string | null;
  options: string[];
  option_a: string | null;
  option_b: string | null;
  correct_option: number | null;
  starts_at: string;
  ends_at: string;
  is_resolved: boolean;
  creator_id: string | null;
  approval_status: string;
}

interface UserPrediction {
  event_id: string;
  selected_option: number;
  is_correct: boolean | null;
}

interface PredictionStats {
  [eventId: string]: {
    [optionIndex: number]: number;
    total: number;
  };
}

interface Participant {
  user_id: string;
  selected_option: number;
  profiles?: {
    full_name: string;
    display_number: number;
  };
}

export default function Predictions() {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [userPredictions, setUserPredictions] = useState<Map<string, UserPrediction>>(new Map());
  const [selectedOptions, setSelectedOptions] = useState<Map<string, number>>(new Map());
  const [predictionStats, setPredictionStats] = useState<PredictionStats>({});
  const [termsAccepted, setTermsAccepted] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);
  const [showTerms, setShowTerms] = useState(false);
  const [participants, setParticipants] = useState<Map<string, Participant[]>>(new Map());
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchEvents();
    fetchPredictionStats();
    if (user) {
      fetchUserPredictions();
    }
  }, [user]);

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('starts_at', { ascending: true });

    if (!error && data) {
      // Parse options from JSON and filter by approval
      const eventsWithParsedOptions = data
        .filter(event => event.approval_status === 'approved' || event.creator_id === user?.id || isAdmin)
        .map(event => {
          let options: string[] = [];
          if (event.option_a && event.option_b) {
            options = [event.option_a, event.option_b];
          } else if (Array.isArray(event.options)) {
            options = (event.options as string[]).slice(0, 2);
          } else if (typeof event.options === 'string') {
            options = JSON.parse(event.options).slice(0, 2);
          }
          return {
            ...event,
            options
          };
        });
      setEvents(eventsWithParsedOptions);

      // Fetch participants for admin
      if (isAdmin) {
        fetchParticipants(eventsWithParsedOptions.map(e => e.id));
      }
    }
    setLoading(false);
  };

  const fetchParticipants = async (eventIds: string[]) => {
    const { data, error } = await supabase
      .from('predictions')
      .select('event_id, user_id, selected_option')
      .in('event_id', eventIds);

    if (error || !data) return;

    // Get user profiles
    const userIds = [...new Set(data.map(p => p.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, display_number')
      .in('user_id', userIds);

    const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    // Group by event
    const participantsMap = new Map<string, Participant[]>();
    data.forEach(pred => {
      const list = participantsMap.get(pred.event_id) || [];
      list.push({
        ...pred,
        profiles: profilesMap.get(pred.user_id)
      });
      participantsMap.set(pred.event_id, list);
    });

    setParticipants(participantsMap);
  };

  const fetchPredictionStats = async () => {
    const { data, error } = await supabase
      .from('predictions')
      .select('event_id, selected_option');

    if (!error && data) {
      const stats: PredictionStats = {};
      
      data.forEach(prediction => {
        if (!stats[prediction.event_id]) {
          stats[prediction.event_id] = { total: 0 };
        }
        stats[prediction.event_id][prediction.selected_option] = 
          (stats[prediction.event_id][prediction.selected_option] || 0) + 1;
        stats[prediction.event_id].total++;
      });

      setPredictionStats(stats);
    }
  };

  const fetchUserPredictions = async () => {
    const { data, error } = await supabase
      .from('predictions')
      .select('event_id, selected_option, is_correct')
      .eq('user_id', user?.id);

    if (!error && data) {
      const predictionsMap = new Map(data.map(p => [p.event_id, p]));
      setUserPredictions(predictionsMap);
    }
  };

  const submitPrediction = async (eventId: string) => {
    if (!user) {
      toast.error('Please sign in to make predictions');
      return;
    }

    if (!termsAccepted.get(eventId)) {
      toast.error('Please accept the terms and conditions');
      return;
    }

    const selectedOption = selectedOptions.get(eventId);
    if (selectedOption === undefined) {
      toast.error('Please select an option');
      return;
    }

    const { error } = await supabase.from('predictions').insert({
      event_id: eventId,
      user_id: user.id,
      selected_option: selectedOption,
      terms_accepted: true,
    });

    if (error) {
      if (error.code === '23505') {
        toast.error('You already made a prediction for this event');
      } else {
        toast.error('Failed to submit prediction');
      }
    } else {
      toast.success('Prediction submitted!');
      fetchUserPredictions();
      fetchPredictionStats();
    }
  };

  const handleDeleteEvent = async () => {
    if (!deleteEventId) return;
    setDeleting(true);
    // Delete predictions first, then the event
    await supabase.from('predictions').delete().eq('event_id', deleteEventId);
    const { error } = await supabase.from('events').delete().eq('id', deleteEventId);
    setDeleting(false);
    if (error) {
      toast.error('Failed to delete prediction event');
    } else {
      toast.success('Prediction event deleted');
      setEvents(prev => prev.filter(e => e.id !== deleteEventId));
    }
    setDeleteEventId(null);
  };

  const getEventStatus = (event: Event) => {
    const now = new Date();
    const starts = new Date(event.starts_at);
    const ends = new Date(event.ends_at);

    if (event.is_resolved) return 'resolved';
    if (now < starts) return 'upcoming';
    if (now >= starts && now <= ends) return 'active';
    return 'ended';
  };

  const getStatusBadge = (status: string, approvalStatus: string) => {
    if (approvalStatus === 'pending') {
      return <Badge className="bg-warning/10 text-warning border-warning/20">Pending Approval</Badge>;
    }
    switch (status) {
      case 'upcoming':
        return <Badge className="bg-info/10 text-info border-info/20">Upcoming</Badge>;
      case 'active':
        return <Badge className="bg-success/10 text-success border-success/20">Active</Badge>;
      case 'ended':
        return <Badge className="bg-warning/10 text-warning border-warning/20">Ended</Badge>;
      case 'resolved':
        return <Badge className="bg-primary/10 text-primary border-primary/20">Resolved</Badge>;
      default:
        return null;
    }
  };

  const getOptionPercentage = (eventId: string, optionIndex: number): number => {
    const stats = predictionStats[eventId];
    if (!stats || stats.total === 0) return 0;
    return Math.round(((stats[optionIndex] || 0) / stats.total) * 100);
  };

  return (
    <AppLayout>
      <PageHeader 
        title="Predictions" 
        subtitle="Predict event outcomes"
        action={
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-full"
              onClick={() => navigate('/game')}
            >
              <Gamepad2 className="w-4 h-4 mr-1" />
              Game
            </Button>
            <Link to="/predictions/create">
              <Button size="sm" className="rounded-full bg-gradient-primary shadow-primary">
                <Plus className="w-4 h-4 mr-1" />
                Create
              </Button>
            </Link>
          </div>
        }
      />

      <RulesBanner location="predictions" />
      
      <div className="px-4 py-4 space-y-4">
        <SectionAd placement="predictions" />

        {/* Terms Dialog */}
        <Dialog open={showTerms} onOpenChange={setShowTerms}>
          <DialogContent className="max-w-lg max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Terms & Conditions
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[60vh] pr-4">
              <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {PREDICTION_TERMS}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="w-3/4 h-6 bg-muted rounded mb-3" />
                <div className="w-full h-4 bg-muted rounded mb-4" />
                <div className="space-y-2">
                  {[1, 2].map((j) => (
                    <div key={j} className="w-full h-10 bg-muted rounded-lg" />
                  ))}
                </div>
              </Card>
            ))}
          </div>
        ) : events.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-display font-bold text-lg mb-2">No predictions yet</h3>
            <p className="text-muted-foreground mb-4">Create a prediction event!</p>
            <Link to="/predictions/create">
              <Button className="rounded-full">
                <Plus className="w-4 h-4 mr-2" />
                Create Prediction
              </Button>
            </Link>
          </Card>
        ) : (
          events.map((event) => {
            const status = getEventStatus(event);
            const userPrediction = userPredictions.get(event.id);
            const hasPredicted = !!userPrediction;
            const eventStats = predictionStats[event.id];
            const totalVotes = eventStats?.total || 0;
            const eventParticipants = participants.get(event.id) || [];

            return (
              <Card key={event.id} className="p-4 shadow-soft animate-fade-in">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-semibold text-foreground text-lg">{event.title}</h3>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(status, event.approval_status)}
                    {isAdmin && (
                      <button
                        onClick={() => setDeleteEventId(event.id)}
                        className="text-destructive hover:text-destructive/80 transition-colors"
                        title="Delete prediction"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Ends: {format(new Date(event.ends_at), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{totalVotes} predictions</span>
                  </div>
                </div>

                {/* Options - Binary choices */}
                <div className="space-y-3">
                  {event.options.slice(0, 2).map((option, index) => {
                    const isSelected = selectedOptions.get(event.id) === index;
                    const isPredicted = userPrediction?.selected_option === index;
                    const isCorrect = event.is_resolved && event.correct_option === index;
                    const percentage = getOptionPercentage(event.id, index);

                    return (
                      <button
                        key={index}
                        disabled={hasPredicted || (status !== 'active' && status !== 'upcoming') || event.approval_status !== 'approved'}
                        onClick={() => {
                          if (!hasPredicted) {
                            setSelectedOptions(new Map(selectedOptions.set(event.id, index)));
                          }
                        }}
                        className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                          isCorrect
                            ? 'border-success bg-success/10'
                            : isPredicted
                            ? 'border-primary bg-primary/10'
                            : isSelected
                            ? 'border-primary bg-accent'
                            : 'border-border hover:border-primary/50'
                        } ${(hasPredicted || (status !== 'active' && status !== 'upcoming') || event.approval_status !== 'approved') ? 'cursor-default' : 'cursor-pointer'}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{option}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-muted-foreground">
                              {percentage}%
                            </span>
                            {isPredicted && (
                              <Badge variant="outline" className="text-xs">
                                Your pick
                              </Badge>
                            )}
                            {isCorrect && (
                              <Trophy className="w-4 h-4 text-success" />
                            )}
                          </div>
                        </div>
                        <Progress 
                          value={percentage} 
                          className="h-2"
                        />
                      </button>
                    );
                  })}
                </div>

                {/* Terms Acceptance */}
                {!hasPredicted && (status === 'active' || status === 'upcoming') && event.approval_status === 'approved' && (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <Checkbox 
                        id={`terms-${event.id}`}
                        checked={termsAccepted.get(event.id) || false}
                        onCheckedChange={(checked) => {
                          setTermsAccepted(new Map(termsAccepted.set(event.id, !!checked)));
                        }}
                      />
                      <label htmlFor={`terms-${event.id}`} className="text-xs text-muted-foreground">
                        I accept the{' '}
                        <button 
                          type="button"
                          onClick={() => setShowTerms(true)}
                          className="text-primary underline"
                        >
                          terms and conditions
                        </button>
                      </label>
                    </div>
                    
                    <Button
                      className="w-full rounded-xl"
                      disabled={selectedOptions.get(event.id) === undefined || !termsAccepted.get(event.id)}
                      onClick={() => submitPrediction(event.id)}
                    >
                      Submit Prediction
                    </Button>
                  </div>
                )}

                {/* Admin: View Participants */}
                {isAdmin && eventParticipants.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Participants ({eventParticipants.length})
                    </p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {eventParticipants.map((p, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span>
                            {p.profiles?.full_name || 'Member'}
                            {p.profiles?.display_number && p.profiles.display_number > 1 && `#${p.profiles.display_number}`}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {event.options[p.selected_option]}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {hasPredicted && event.is_resolved && (
                  <div className={`mt-4 p-3 rounded-xl ${
                    userPrediction.is_correct
                      ? 'bg-success/10 text-success'
                      : 'bg-destructive/10 text-destructive'
                  }`}>
                    <div className="flex items-center gap-2">
                      {userPrediction.is_correct ? (
                        <>
                          <Trophy className="w-5 h-5" />
                          <span className="font-semibold">You predicted correctly!</span>
                        </>
                      ) : (
                        <span className="font-semibold">Better luck next time!</span>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      <DeleteConfirmDialog
        open={!!deleteEventId}
        onOpenChange={(open) => !open && setDeleteEventId(null)}
        onConfirm={handleDeleteEvent}
        title="Delete this prediction?"
        description="This will permanently delete the prediction and all user submissions. This cannot be undone."
        loading={deleting}
      />
    </AppLayout>
  );
}