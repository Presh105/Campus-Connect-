import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Send, Gift, AlertTriangle, ShieldCheck, Sparkles, Plus, X } from 'lucide-react';
import { ImageUpload } from '@/components/ImageUpload';
import { TASK_URGENCY, GENDERS } from '@/lib/constants';
import { useBanCheck } from '@/hooks/useBanCheck';

export default function CreateTask() {
  const { user, profile } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const { isBanned, loading: banLoading } = useBanCheck('tasks');
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reward, setReward] = useState('');
  const [urgency, setUrgency] = useState('medium');
  const [deadline, setDeadline] = useState('');
  const [genderRestriction, setGenderRestriction] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isSponsored, setIsSponsored] = useState(false);
  const [whatsappLink, setWhatsappLink] = useState('');

  const isPaidTask = /₦|naira|\d+k?/i.test(reward);

  useEffect(() => {
    if (!banLoading && isBanned) {
      toast.error('You are banned from creating tasks');
      navigate('/tasks');
    }
  }, [isBanned, banLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error('Please sign in'); return; }
    if (!title.trim() || !description.trim() || !reward.trim()) { toast.error('Please fill in all fields'); return; }

    // Point 17: Anonymous users cannot attach WhatsApp links
    if (whatsappLink && profile?.is_anonymous) {
      toast.error('You must exit anonymous mode to attach a WhatsApp link');
      return;
    }

    if (whatsappLink && !/^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(whatsappLink.trim())) {
      toast.error('WhatsApp link must start with https://wa.me/ or https://api.whatsapp.com/');
      return;
    }

    setLoading(true);
    // All tasks require admin approval
    const approvalStatus = isAdmin ? 'approved' : 'pending';

    const { error } = await supabase.from('tasks').insert({
      poster_id: user.id,
      title: title.trim(),
      description: description.trim(),
      reward: reward.trim(),
      image_url: imageUrls[0] || null,
      image_urls: imageUrls.length > 1 ? imageUrls.slice(1) : null,
      urgency,
      deadline: deadline || null,
      gender_restriction: genderRestriction ? (genderRestriction as 'male' | 'female') : null,
      approval_status: approvalStatus as 'pending' | 'approved' | 'rejected',
      payment_confirmed: false,
      whatsapp_link: whatsappLink || null,
    });

    if (error) {
      toast.error('Failed to create task');
      if (import.meta.env.DEV) console.error(error);
    } else {
      toast.success(approvalStatus === 'pending' ? 'Task submitted for admin approval!' : 'Task created successfully!');
      navigate('/tasks');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Create Task" subtitle="Get help from fellow members" showBack />

      <div className="px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Point 12: Escrow note */}
          <Alert>
            <ShieldCheck className="w-4 h-4" />
            <AlertDescription>
              <strong>Escrow Protection:</strong> Money must be sent to the app to protect both parties from scam. Payment is released only after task completion and approval.
            </AlertDescription>
          </Alert>

          {(isPaidTask || isSponsored) && (
            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                {isSponsored 
                  ? 'Sponsored tasks require payment confirmation. An admin will approve after payment is verified.'
                  : 'Paid tasks require admin approval. Complete payment externally, and an admin will approve.'}
              </AlertDescription>
            </Alert>
          )}

          <Card className="p-4 shadow-soft">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Task Title</Label>
                <Input id="title" placeholder="What do you need help with?" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} className="rounded-xl h-12" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" placeholder="Describe the task in detail..." value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} className="rounded-xl min-h-[120px] resize-none" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reward">Reward</Label>
                <div className="relative">
                  <Gift className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
                  <Input id="reward" placeholder="e.g., ₦500, Free lunch" value={reward} onChange={(e) => setReward(e.target.value)} maxLength={200} className="rounded-xl h-12 pl-12" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Urgency</Label>
                  <Select value={urgency} onValueChange={setUrgency}>
                    <SelectTrigger className="rounded-xl h-12"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {TASK_URGENCY.map((u) => (<SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Deadline</Label>
                  <Input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="rounded-xl h-12" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Gender Restriction (optional)</Label>
                <Select value={genderRestriction} onValueChange={(val) => setGenderRestriction(val === 'any' ? '' : val)}>
                  <SelectTrigger className="rounded-xl h-12"><SelectValue placeholder="Anyone can apply" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Anyone</SelectItem>
                    {GENDERS.map((g) => (<SelectItem key={g.value} value={g.value}>{g.label} only</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              {/* Point 8: WhatsApp link for submission */}
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp Submission Link (optional)</Label>
                <Input id="whatsapp" placeholder="https://wa.me/..." value={whatsappLink} onChange={(e) => setWhatsappLink(e.target.value)} className="rounded-xl h-12" />
                <p className="text-xs text-muted-foreground">Only the accepted worker will see this link</p>
              </div>

              {/* Sponsored Toggle */}
              <div className="flex items-center justify-between p-4 bg-accent rounded-xl">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-warning" />
                  <div>
                    <p className="font-medium text-foreground">Sponsor Task</p>
                    <p className="text-xs text-muted-foreground">Boost visibility (requires payment)</p>
                  </div>
                </div>
                <Switch checked={isSponsored} onCheckedChange={setIsSponsored} />
              </div>

              {/* Point 10: Multiple images */}
              <div className="space-y-2">
                <Label>Images (up to 4)</Label>
                <div className="space-y-2">
                  {imageUrls.map((url, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <img src={url} alt="" className="w-16 h-16 rounded-lg object-cover" />
                      <Button type="button" variant="ghost" size="icon" onClick={() => setImageUrls(prev => prev.filter((_, i) => i !== idx))}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {imageUrls.length < 4 && user && (
                    <ImageUpload bucket="tasks" userId={user.id} onUpload={(url) => setImageUrls(prev => [...prev, url])} />
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Point 8: Safety warning */}
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              ⚠️ Do NOT send money to individuals. Connect is not responsible for offline incidents but will try to take action against scammers.
            </AlertDescription>
          </Alert>

          <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl bg-gradient-secondary shadow-secondary font-semibold">
            <Send className="w-4 h-4 mr-2" />
            {loading ? 'Creating...' : isPaidTask ? 'Submit for Approval' : 'Create Task'}
          </Button>
        </form>
      </div>
    </div>
  );
    }
