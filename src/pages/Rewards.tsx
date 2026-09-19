import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Wallet, ShieldCheck } from 'lucide-react';

export default function Rewards() {
  const { user, profile } = useAuth();
  const [rewards, setRewards] = useState<any[]>([]);
  const [phone, setPhone] = useState((profile as any)?.payout_phone || '');
  const [network, setNetwork] = useState((profile as any)?.payout_network || 'mtn');
  const [postCount, setPostCount] = useState(0);
  const [accountAgeDays, setAccountAgeDays] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('monetization_rewards' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }) as any;
      setRewards(data || []);

      const { count } = await supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
      setPostCount(count || 0);

      if ((profile as any)?.created_at) {
        const ageMs = Date.now() - new Date((profile as any).created_at).getTime();
        setAccountAgeDays(Math.floor(ageMs / (1000 * 60 * 60 * 24)));
      }
    })();
  }, [user, profile]);

  const isEligible = (profile as any)?.monetization_override === true || (postCount >= 150 && accountAgeDays >= 60);
  const total = rewards.filter(r => r.status === 'paid').reduce((s, r) => s + Number(r.amount || 0), 0);

  const savePayout = async () => {
    if (!user) return;
    const { error } = await supabase.from('profiles').update({ payout_phone: phone, payout_network: network } as any).eq('user_id', user.id);
    if (error) toast.error('Failed to save'); else toast.success('Payout details saved');
  };

  return (
    <AppLayout>
      <PageHeader title="Rewards Vault" subtitle="Your monetization earnings" />
      <div className="px-4 py-4 space-y-4">
        <Card className="p-4 bg-gradient-primary text-primary-foreground">
          <div className="flex items-center gap-3">
            <Wallet className="w-8 h-8" />
            <div>
              <p className="text-xs opacity-80">Total paid</p>
              <p className="text-2xl font-bold">₦{total.toLocaleString()}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className={`w-5 h-5 ${isEligible ? 'text-primary' : 'text-muted-foreground'}`} />
            <h3 className="font-semibold">Eligibility</h3>
            <Badge variant={isEligible ? 'default' : 'outline'} className="ml-auto">{isEligible ? 'Eligible' : 'Not eligible'}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">Requires 60+ days account age and 150+ posts (or admin override).</p>
          <div className="grid grid-cols-2 gap-2 text-sm pt-1">
            <div>Account age: <strong>{accountAgeDays} days</strong></div>
            <div>Posts: <strong>{postCount}</strong></div>
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <h3 className="font-semibold">Payout details</h3>
          <div className="space-y-2">
            <Label>Network</Label>
            <Select value={network} onValueChange={setNetwork}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mtn">MTN</SelectItem>
                <SelectItem value="glo">GLO</SelectItem>
                <SelectItem value="airtel">Airtel</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Phone number</Label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="0801..." className="rounded-xl" />
          </div>
          <Button onClick={savePayout} className="w-full rounded-xl">Save</Button>
        </Card>

        <div className="space-y-2">
          <h3 className="font-semibold text-sm text-muted-foreground">Reward history</h3>
          {rewards.length === 0 ? (
            <Alert><AlertDescription className="text-sm">No rewards yet. Keep posting and engaging.</AlertDescription></Alert>
          ) : rewards.map(r => (
            <Card key={r.id} className="p-3 flex items-center justify-between">
              <div>
                <p className="font-bold">₦{Number(r.amount).toLocaleString()} <span className="text-xs font-normal text-muted-foreground">via {r.network?.toUpperCase()}</span></p>
                {r.notes && <p className="text-xs text-muted-foreground">{r.notes}</p>}
                <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
              </div>
              <Badge variant={r.status === 'paid' ? 'default' : r.status === 'rejected' ? 'destructive' : 'outline'}>{r.status}</Badge>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
