import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Wallet, Copy, Check, X } from 'lucide-react';

export default function AdminWithdrawals() {
  const { isAdmin, loading } = useAdmin();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => { if (!loading && !isAdmin) navigate('/'); }, [isAdmin, loading, navigate]);

  const fetch = async () => {
    const { data: w } = await supabase.from('withdrawal_requests' as any).select('*').order('created_at', { ascending: false }) as any;
    if (!w) return;
    const ids = [...new Set(w.map((x: any) => x.user_id as string))] as string[];
    const { data: profs } = await supabase.from('profiles').select('user_id, full_name, system_id, points').in('user_id', ids);
    const map = new Map((profs || []).map(p => [p.user_id, p]));
    setItems(w.map((x: any) => ({ ...x, profile: map.get(x.user_id) })));
  };

  useEffect(() => { if (isAdmin) fetch(); }, [isAdmin]);

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('withdrawal_requests' as any).update({ status, admin_notes: notes[id] || null } as any).eq('id', id);
    if (error) toast.error('Failed'); else { toast.success('Updated'); fetch(); }
  };

  const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success('Copied'); };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Withdrawal Requests" subtitle="Credit users' bank accounts" showBack />
      <div className="px-4 py-4 space-y-3">
        <Alert><Wallet className="w-4 h-4" /><AlertDescription className="text-sm">Pay the user via your bank app, then mark as Paid. Points have already been deducted.</AlertDescription></Alert>
        {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No withdrawal requests yet.</p>}
        {items.map(it => (
          <Card key={it.id} className="p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm">{it.profile?.full_name || 'User'}</p>
                {it.profile?.system_id && <p className="text-[11px] font-mono text-muted-foreground">{it.profile.system_id}</p>}
                <p className="text-xs mt-1">Requested: <strong>{it.points} pts</strong></p>
              </div>
              <Badge variant={it.status === 'paid' ? 'default' : it.status === 'rejected' ? 'destructive' : 'outline'}>{it.status}</Badge>
            </div>
            <div className="bg-muted rounded-lg p-2 space-y-1 text-sm">
              <button onClick={() => copy(it.bank_name)} className="flex items-center gap-2 w-full text-left hover:bg-background/50 px-1 rounded"><Copy className="w-3 h-3" /> {it.bank_name}</button>
              <button onClick={() => copy(it.account_number)} className="flex items-center gap-2 w-full text-left hover:bg-background/50 px-1 rounded font-mono"><Copy className="w-3 h-3" /> {it.account_number}</button>
              <button onClick={() => copy(it.account_name)} className="flex items-center gap-2 w-full text-left hover:bg-background/50 px-1 rounded"><Copy className="w-3 h-3" /> {it.account_name}</button>
            </div>
            {it.status === 'pending' && (
              <>
                <Textarea placeholder="Notes (optional)" value={notes[it.id] || ''} onChange={e => setNotes(n => ({ ...n, [it.id]: e.target.value }))} className="text-xs rounded-lg" rows={2} />
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 rounded-xl" onClick={() => setStatus(it.id, 'paid')}><Check className="w-3 h-3 mr-1" /> Mark Paid</Button>
                  <Button size="sm" variant="destructive" className="flex-1 rounded-xl" onClick={() => setStatus(it.id, 'rejected')}><X className="w-3 h-3 mr-1" /> Reject</Button>
                </div>
              </>
            )}
            {it.admin_notes && <p className="text-xs italic text-muted-foreground">"{it.admin_notes}"</p>}
            <p className="text-[10px] text-muted-foreground">{new Date(it.created_at).toLocaleString()}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
