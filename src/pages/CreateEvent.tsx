import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Send, Calendar, MapPin, AlertTriangle } from 'lucide-react';
import { useBanCheck } from '@/hooks/useBanCheck';

export default function CreateEvent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isBanned, loading: banLoading } = useBanCheck('events');
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [location, setLocation] = useState('');

  useEffect(() => {
    if (!banLoading && isBanned) {
      toast.error('You are banned from creating events');
      navigate('/events');
    }
  }, [isBanned, banLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please sign in to create an event');
      return;
    }

    if (!title.trim() || !eventDate) {
      toast.error('Please fill in required fields');
      return;
    }

    setLoading(true);

    const { error } = await supabase.from('school_events').insert({
      creator_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      event_date: new Date(eventDate).toISOString(),
      location: location.trim() || null,
      approval_status: 'pending',
    });

    if (error) {
      toast.error('Failed to create event');
      console.error(error);
    } else {
      toast.success('Event submitted for admin approval!');
      navigate('/events');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Add Event" subtitle="Share local happenings" showBack />

      <div className="px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Alert>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              All events require admin approval before being visible to other members.
            </AlertDescription>
          </Alert>

          <Card className="p-4 shadow-soft">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Event Title *</Label>
                <Input
                  id="title"
                  placeholder="What's happening?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="rounded-xl h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Tell us more about this event..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="rounded-xl min-h-[100px] resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="eventDate">Date & Time *</Label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="eventDate"
                    type="datetime-local"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="rounded-xl h-12 pl-12"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="location"
                    placeholder="Where is it happening?"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="rounded-xl h-12 pl-12"
                  />
                </div>
              </div>
            </div>
          </Card>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-gradient-primary shadow-primary font-semibold"
          >
            <Send className="w-4 h-4 mr-2" />
            {loading ? 'Submitting...' : 'Submit for Approval'}
          </Button>
        </form>
      </div>
    </div>
  );
}
