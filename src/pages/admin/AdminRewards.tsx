import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Wallet, Search, Trash2, Plus } from 'lucide-react';

export default function AdminRewards() {
  const { isAdmin, loading } = useAdmin();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [postCounts, setPostCounts] = useState<Record<string, number>>({});

  // Airtime bank
  const [codes, setCodes] = useState<any[]>([]);
  const [newCode, setNewCode] = useState({ network: 'mtn', code: '', amount: '' });

  useEffect(() => { if (!loading && !isAdmin) navigate('/'); }, [isAdmin, loading, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const { data } = await supabase.from('profiles').select('user_id, full_name, system_id, reg_number, monetization_override, created_at').order('full_name');
      if (data) setProfiles(data);
      fetchCodes();
    })();
  }, [isAdmin]);

  const fetchCodes = async () => {
    const { data } = await supabase.from('airtime_codes' as any).select('*').order('created_at', { ascending: false }) as any;
    if (data) setCodes(data);
  };

  const filtered = profiles.filter(p => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return p.full_name?.toLowerCase().includes(q) || p.system_id?.toLowerCase().includes(q) || p.reg_number?.toLowerCase().includes(q);
  });

  const loadCount = async (uid: string) => {
    if (postCounts[uid] !== undefined) return;
    const { count } = await supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', uid);
    setPostCounts(prev => ({ ...prev, [uid]: count || 0 }));
  };

  const toggleOverride = async (uid: string, value: boolean) => {
    const { error } = await supabase.from('profiles').update({ monetization_override: value }).eq('user_id', uid);
    if (error) toast.error('Failed');
    else { toast.success('Updated'); setProfiles(p => p.map(x => x.user_id === uid ? { ...x, monetization_override: value } : x)); }
  };

  const addCode = async () => {
    if (!user || !newCode.code.trim()) return;
    const { error } = await supabase.from('airtime_codes' as any).insert({ network: newCode.network, code: newCode.code.trim(), amount: Number(newCode.amount) || 0, added_by: user.id } as any);
    if (error) toast.error('Failed'); else { toast.success('Code added'); setNewCode({ network: newCode.network, code: '', amount: '' }); fetchCodes(); }
  };
  const removeCode = async (id: string) => {
    await supabase.from('airtime_codes' as any).delete().eq('id', id);
    fetchCodes();
  };

  const grouped = { mtn: codes.filter(c => c.network==='mtn'), glo: codes.filter(c => c.network==='glo'), airtel: codes.filter(c => c.network==='airtel') };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Issue Rewards" subtitle="Monetization vault" showBack />
      <div className="px-4 py-4 space-y-4">
        <Alert><Wallet className="w-4 h-4" /><AlertDescription className="text-sm">Manage user eligibility and the airtime bank. Codes are auto-sent when you monetize a post.</AlertDescription></Alert>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid grid-cols-2 w-full rounded-xl">
            <TabsTrigger value="users" className="rounded-lg">Users</TabsTrigger>
            <TabsTrigger value="bank" className="rounded-lg">Airtime Bank</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search user…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-full" />
            </div>
            {filtered.slice(0, 100).map(p => {
              const ageDays = Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400000);
              const count = postCounts[p.user_id];
              const eligible = p.monetization_override || ((count ?? 0) >= 150 && ageDays >= 60);
              return (
                <Card key={p.user_id} className="p-3 space-y-2" onClick={() => loadCount(p.user_id)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">{p.full_name}</p>
                      {p.system_id && <p className="text-xs text-muted-foreground font-mono">{p.system_id}</p>}
                      <div className="flex gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">Age: {ageDays}d</Badge>
                        <Badge variant="outline" className="text-xs">Posts: {count ?? '…'}</Badge>
                        <Badge variant={eligible ? 'default' : 'outline'} className="text-xs">{eligible ? 'Eligible' : 'Not eligible'}</Badge>
                      </div>
                    </div>
                    <label className="flex flex-col items-center gap-1 text-xs">
                      <span>Override</span>
                      <Switch checked={!!p.monetization_override} onCheckedChange={(v) => toggleOverride(p.user_id, v)} />
                    </label>
                  </div>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="bank" className="mt-4 space-y-3">
            <Card className="p-3 space-y-2">
              <h3 className="font-semibold text-sm">Add Airtime Code</h3>
              <div className="grid grid-cols-3 gap-2">
                <Select value={newCode.network} onValueChange={v => setNewCode(c => ({ ...c, network: v }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mtn">MTN</SelectItem>
                    <SelectItem value="glo">GLO</SelectItem>
                    <SelectItem value="airtel">Airtel</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Code" value={newCode.code} onChange={e => setNewCode(c => ({ ...c, code: e.target.value }))} className="rounded-xl" />
                <Input placeholder="₦ Amount" type="number" value={newCode.amount} onChange={e => setNewCode(c => ({ ...c, amount: e.target.value }))} className="rounded-xl" />
              </div>
              <Button size="sm" onClick={addCode} className="w-full rounded-xl"><Plus className="w-3 h-3 mr-1" /> Add to bank</Button>
            </Card>
            {(['mtn','glo','airtel'] as const).map(net => (
              <div key={net} className="space-y-1">
                <h4 className="font-semibold text-sm uppercase text-primary">{net} ({grouped[net].length})</h4>
                {grouped[net].length === 0 && <p className="text-xs text-muted-foreground">Empty</p>}
                {grouped[net].map(c => (
                  <Card key={c.id} className={`p-2 flex items-center justify-between ${c.is_used ? 'opacity-50' : ''}`}>
                    <div className="min-w-0">
                      <p className="font-mono text-sm truncate">{c.code}</p>
                      <p className="text-[10px] text-muted-foreground">₦{c.amount} {c.is_used ? '· used' : '· available'}</p>
                    </div>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeCode(c.id)}><Trash2 className="w-3 h-3" /></Button>
                  </Card>
                ))}
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
