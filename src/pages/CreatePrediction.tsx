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
import { Send, TrendingUp, AlertTriangle } from 'lucide-react';
import { useBanCheck } from '@/hooks/useBanCheck';

export default function CreatePrediction() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isBanned, loading: banLoading } = useBanCheck('predictions');
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');

  useEffect(() => {
    if (!banLoading && isBanned) {
      toast.error('You are banned from creating predictions');
      navigate('/predictions');
    }
  }, [isBanned, banLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please sign in to create a prediction');
      return;
    }

    if (!title.trim() || !optionA.trim() || !optionB.trim() || !startsAt || !endsAt) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (new Date(endsAt) <= new Date(startsAt)) {
      toast.error('End date must be after start date');
      return;
    }

    setLoading(true);

    const { error } = await supabase.from('events').insert({
      creator_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      option_a: optionA.trim(),
      option_b: optionB.trim(),
      options: [optionA.trim(), optionB.trim()],
      starts_at: new Date(startsAt).toISOString(),
      ends_at: new Date(endsAt).toISOString(),
      approval_status: 'pending',
      requires_payment: false,
    });

    if (error) {
      toast.error('Failed to create prediction');
      console.error(error);
    } else {
      toast.success('Prediction submitted for admin approval!');
      navigate('/predictions');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Create Prediction" subtitle="Let others predict the outcome" showBack />

      <div className="px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Alert>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              All predictions require admin approval before being visible.
            </AlertDescription>
          </Alert>

          <Card className="p-4 shadow-soft">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Prediction Question *</Label>
                <Input
                  id="title"
                  placeholder="What are you predicting?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="rounded-xl h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Additional context..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="rounded-xl min-h-[80px] resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label>Outcome Options *</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Option A</Label>
                    <Input
                      placeholder="First outcome"
                      value={optionA}
                      onChange={(e) => setOptionA(e.target.value)}
                      className="rounded-xl h-12"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Option B</Label>
                    <Input
                      placeholder="Second outcome"
                      value={optionB}
                      onChange={(e) => setOptionB(e.target.value)}
                      className="rounded-xl h-12"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Start Date *</Label>
                  <Input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="rounded-xl h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date *</Label>
                  <Input
                    type="datetime-local"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                    className="rounded-xl h-12"
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
