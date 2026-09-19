import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Heart, Plus, Trash2, IdCard, Clock, AlertTriangle, Eye, ChevronLeft, ChevronRight, Copy, Check, KeyRound, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SectionAd } from '@/components/ads/SectionAd';

interface WelfareItem {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  item_type: string;
  image_url: string | null;
  is_active: boolean;
}

interface WelfareCode {
  id: string;
  code: string;
  is_claimed: boolean;
  claimed_by: string | null;
}

type CountdownSpeed = 'normal' | 'fast' | 'superfast';

const SPEED_INTERVALS: Record<CountdownSpeed, number> = {
  normal: 1000,
  fast: 500,
  superfast: 200,
};

const SPEED_LABELS: Record<CountdownSpeed, string> = {
  normal: 'Normal (1s)',
  fast: 'Fast (0.5s)',
  superfast: 'Super Fast (0.2s)',
};

export function FoodPantriesTab() {
  const { user, profile } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const [items, setItems] = useState<WelfareItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [bulkItems, setBulkItems] = useState([{ name: '', description: '', quantity: '1', item_type: 'general', image_url: '' }]);
  const studentId = (profile as any)?.system_id || null;

  const [showingId, setShowingId] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [canUseToday, setCanUseToday] = useState(true);
  const [lastUsed, setLastUsed] = useState<string | null>(null);

  // Codes state
  const [codesCount, setCodesCount] = useState(0);
  const [allCodes, setAllCodes] = useState<WelfareCode[]>([]);
  const [claimedCode, setClaimedCode] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [showAddCodes, setShowAddCodes] = useState(false);
  const [bulkCodes, setBulkCodes] = useState('');
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editCodeValue, setEditCodeValue] = useState('');

  // Admin countdown config
  const [countdownSpeed, setCountdownSpeed] = useState<CountdownSpeed>(() => {
    return (localStorage.getItem('welfare_countdown_speed') as CountdownSpeed) || 'normal';
  });
  const [countdownDuration, setCountdownDuration] = useState<number>(() => {
    return parseInt(localStorage.getItem('welfare_countdown_duration') || '30');
  });

  useEffect(() => { fetchItems(); fetchCodesCount(); if (isAdmin) fetchAllCodes(); checkLastUsage(); }, [user, isAdmin]);

  useEffect(() => {
    if (countdown <= 0) {
      if (showingId) {
        setShowingId(false);
        setClaimedCode(null);
        setCanUseToday(false);
        // Record server-side claim to prevent cheating
        if (user) {
          supabase.from('welfare_claims').insert({ user_id: user.id } as any);
          localStorage.setItem(`welfare_used_${user.id}`, new Date().toISOString());
        }
      }
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), SPEED_INTERVALS[countdownSpeed]);
    return () => clearTimeout(timer);
  }, [countdown, showingId, user, countdownSpeed]);

  const checkLastUsage = async () => {
    if (!user) return;
    // Check server-side first (anti-cheat)
    const { data: serverClaim } = await supabase
      .from('welfare_claims')
      .select('claimed_at')
      .eq('user_id', user.id)
      .order('claimed_at', { ascending: false })
      .limit(1)
      .single();

    const lastClaimTime = serverClaim?.claimed_at || localStorage.getItem(`welfare_used_${user.id}`);
    
    if (lastClaimTime) {
      const hoursSince = (Date.now() - new Date(lastClaimTime).getTime()) / (1000 * 60 * 60);
      if (hoursSince < 24) { 
        setCanUseToday(false); 
        setLastUsed(lastClaimTime); 
      } else { 
        setCanUseToday(true); 
        localStorage.removeItem(`welfare_used_${user.id}`); 
      }
    }
  };

  const fetchItems = async () => {
    const { data } = await supabase.from('welfare_items').select('*').eq('is_active', true).order('created_at', { ascending: false });
    if (data) setItems(data as WelfareItem[]);
  };

  const fetchCodesCount = async () => {
    const { count } = await supabase.from('welfare_codes').select('*', { count: 'exact', head: true }).eq('is_claimed', false);
    setCodesCount(count || 0);
  };

  const fetchAllCodes = async () => {
    const { data } = await supabase.from('welfare_codes').select('*').order('is_claimed', { ascending: true });
    if (data) setAllCodes(data as WelfareCode[]);
  };

  const handleShowId = async () => {
    if (!canUseToday) { toast.error('You can only use welfare support once every 24 hours'); return; }
    if (!user) return;

    const { data: availableCode } = await supabase
      .from('welfare_codes')
      .select('*')
      .eq('is_claimed', false)
      .limit(1)
      .single();

    if (availableCode) {
      await supabase.from('welfare_codes').update({ is_claimed: true, claimed_by: user.id } as any).eq('id', availableCode.id);
      setClaimedCode(availableCode.code);
      fetchCodesCount();
    }

    setShowingId(true);
    setCountdown(countdownDuration);
  };

  const handleCopyCode = () => {
    if (!claimedCode) return;
    navigator.clipboard.writeText(claimedCode);
    setCodeCopied(true);
    toast.success('Code copied!');
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleDeleteCode = async (id: string) => {
    await supabase.from('welfare_codes').delete().eq('id', id);
    toast.success('Code deleted');
    fetchAllCodes();
    fetchCodesCount();
  };

  const handleEditCode = async (id: string) => {
    if (!editCodeValue.trim()) return;
    await supabase.from('welfare_codes').update({ code: editCodeValue.trim() } as any).eq('id', id);
    toast.success('Code updated');
    setEditingCode(null);
    setEditCodeValue('');
    fetchAllCodes();
  };

  const handleSaveCountdownConfig = () => {
    localStorage.setItem('welfare_countdown_speed', countdownSpeed);
    localStorage.setItem('welfare_countdown_duration', countdownDuration.toString());
    toast.success('Countdown settings saved');
  };

  const addBulkRow = () => {
    setBulkItems(prev => [...prev, { name: '', description: '', quantity: '1', item_type: 'general', image_url: '' }]);
  };
  const updateBulkRow = (index: number, field: string, value: string) => {
    setBulkItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };
  const removeBulkRow = (index: number) => {
    if (bulkItems.length <= 1) return;
    setBulkItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleBulkAdd = async () => {
    if (!user) return;
    const validItems = bulkItems.filter(item => item.name.trim());
    if (validItems.length === 0) { toast.error('Add at least one item'); return; }
    const insertData = validItems.map(item => ({
      name: item.name.trim(), description: item.description.trim() || null,
      quantity: parseInt(item.quantity) || 1, item_type: item.item_type,
      image_url: item.image_url || null, is_active: true, created_by: user.id,
    }));
    const { error } = await supabase.from('welfare_items').insert(insertData as any);
    if (error) toast.error('Failed to add items');
    else {
      toast.success(`${validItems.length} item(s) added!`);
      setBulkItems([{ name: '', description: '', quantity: '1', item_type: 'general', image_url: '' }]);
      setShowAdd(false); fetchItems();
    }
  };

  const handleAddCodes = async () => {
    const codes = bulkCodes.split('\n').map(c => c.trim()).filter(Boolean);
    if (codes.length === 0) { toast.error('Enter at least one code'); return; }
    const insertData = codes.map(code => ({ code, is_claimed: false }));
    const { error } = await supabase.from('welfare_codes').insert(insertData as any);
    if (error) toast.error('Failed to add codes');
    else {
      toast.success(`${codes.length} code(s) added!`);
      setBulkCodes(''); setShowAddCodes(false); fetchCodesCount(); fetchAllCodes();
    }
  };

  const handleDeleteItem = async (id: string) => {
    await supabase.from('welfare_items').delete().eq('id', id);
    toast.success('Item removed'); fetchItems();
  };

  const getTimeUntilNextUse = () => {
    if (!lastUsed) return '';
    const nextAvailable = new Date(new Date(lastUsed).getTime() + 24 * 60 * 60 * 1000);
    const diff = nextAvailable.getTime() - Date.now();
    if (diff <= 0) return '';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m`;
  };

  const currentItem = items[currentIndex];

  return (
    <div className="space-y-4">
      <SectionAd placement="welfare" />
      <Alert className="border-primary/20 bg-primary/5">
        <Heart className="w-4 h-4 text-primary" />
        <AlertDescription>
          <strong>Community Support</strong> — Essential items (food, airtime, codes, supplies). Please don't take advantage unless you truly need it.
        </AlertDescription>
      </Alert>

      <Alert className="border-warning/30 bg-warning/5">
        <AlertTriangle className="w-4 h-4 text-warning" />
        <AlertDescription className="text-sm">
          Only <strong>verified members</strong> can access support. If you encounter issues, please <button onClick={() => navigate('/contact')} className="text-primary underline font-semibold">contact admin</button> with your ID to get verified.
        </AlertDescription>
      </Alert>

      {/* Items carousel */}
      {items.length === 0 ? (
        <Card className="p-8 text-center">
          <Heart className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No essentials available at the moment</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {currentItem?.image_url && (
            <img src={currentItem.image_url} alt={currentItem.name} className="w-full h-40 object-cover" />
          )}
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-lg text-foreground">{currentItem?.name}</h3>
                <Badge className="mt-1 text-xs">{currentItem?.item_type}</Badge>
              </div>
              <Badge className="bg-primary/10 text-primary border-primary/20">{currentItem?.quantity} remaining</Badge>
            </div>
            {currentItem?.description && !showingId && (
              <p className="text-sm text-muted-foreground mt-2 whitespace-pre-line">{currentItem.description}</p>
            )}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
              <Button variant="ghost" size="sm" disabled={currentIndex === 0} onClick={() => setCurrentIndex(i => i - 1)}>
                <ChevronLeft className="w-4 h-4" /> Prev
              </Button>
              <span className="text-xs text-muted-foreground">{currentIndex + 1} of {items.length}</span>
              <Button variant="ghost" size="sm" disabled={currentIndex >= items.length - 1} onClick={() => setCurrentIndex(i => i + 1)}>
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            {isAdmin && (
              <Button variant="ghost" size="sm" className="mt-2 text-destructive" onClick={() => handleDeleteItem(currentItem.id)}>
                <Trash2 className="w-4 h-4 mr-1" /> Remove
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Recharge Codes Box */}
      <Card className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-primary" /> Recharge Codes
          </h3>
          <Badge variant="outline">{codesCount} available</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {codesCount > 0 ? 'A code will be revealed when you click "Show Your ID" below.' : 'No codes available right now.'}
        </p>
        {showingId && claimedCode && (
          <div className="p-3 bg-primary/5 rounded-xl text-center space-y-2 border border-primary/20">
            <p className="text-xs text-muted-foreground">Your code (tap to copy):</p>
            <button
              onClick={handleCopyCode}
              className="w-full flex items-center justify-center gap-2 text-xl font-mono font-bold text-primary py-2 rounded-lg bg-background hover:bg-muted transition-colors"
            >
              {claimedCode}
              {codeCopied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
        )}
      </Card>

      {/* Show ID Section */}
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <IdCard className="w-5 h-5 text-primary" /> Show Your Welfare ID
        </h3>
        <p className="text-xs text-muted-foreground">
          Click below to display your ID. If codes are available, one will be revealed during the countdown.
        </p>

        {showingId ? (
          <div className="text-center py-6 space-y-3">
            <div className="text-5xl font-mono font-black text-primary tracking-wider">
              {studentId || 'NO ID'}
            </div>
            <div className="flex items-center justify-center gap-2 text-2xl font-bold text-warning">
              <Clock className="w-6 h-6" />
              <span>{countdown}s</span>
            </div>
            {currentItem && (
              <div className="mt-3 p-3 bg-primary/5 rounded-xl text-left">
                <p className="font-bold text-foreground text-sm">{currentItem.name}</p>
                <Badge className="mt-1 text-xs">{currentItem.item_type}</Badge>
                {currentItem.description && (
                  <p className="text-sm text-foreground mt-2 whitespace-pre-line">{currentItem.description}</p>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Present this ID to the support point staff</p>
          </div>
        ) : canUseToday ? (
          <Button onClick={handleShowId} className="w-full rounded-xl" size="lg">
            <Eye className="w-5 h-5 mr-2" /> Show Your ID
          </Button>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">You've already used your welfare support today.</p>
            {getTimeUntilNextUse() && (
              <p className="text-xs text-primary mt-1 font-medium">Next available in: {getTimeUntilNextUse()}</p>
            )}
          </div>
        )}
      </Card>

      {/* Admin: Add items, codes, settings */}
      {isAdmin && (
        <div className="space-y-3">
          {/* Countdown Settings */}
          <Card className="p-4 space-y-3 border-primary/20">
            <h3 className="font-semibold text-sm">⏱️ Countdown Settings</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Duration (seconds)</span>
                <Input type="number" value={countdownDuration} onChange={e => setCountdownDuration(parseInt(e.target.value) || 30)} className="rounded-xl" min={5} max={120} />
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Speed</span>
                <Select value={countdownSpeed} onValueChange={(v) => setCountdownSpeed(v as CountdownSpeed)}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">{SPEED_LABELS.normal}</SelectItem>
                    <SelectItem value="fast">{SPEED_LABELS.fast}</SelectItem>
                    <SelectItem value="superfast">{SPEED_LABELS.superfast}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button size="sm" onClick={handleSaveCountdownConfig} className="rounded-xl">Save Settings</Button>
          </Card>

          {!showAdd ? (
            <Button onClick={() => setShowAdd(true)} className="w-full rounded-xl" variant="outline">
              <Plus className="w-4 h-4 mr-2" /> Add Items
            </Button>
          ) : (
            <Card className="p-4 space-y-3 border-primary/20">
              <h3 className="font-semibold text-sm">Add Welfare Items</h3>
              {bulkItems.map((item, idx) => (
                <div key={idx} className="p-3 bg-muted/50 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Item {idx + 1}</span>
                    {bulkItems.length > 1 && (
                      <Button variant="ghost" size="sm" className="h-6 text-destructive" onClick={() => removeBulkRow(idx)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <Input value={item.name} onChange={e => updateBulkRow(idx, 'name', e.target.value)} placeholder="Item name" className="rounded-xl" />
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={item.quantity} onChange={e => updateBulkRow(idx, 'quantity', e.target.value)} placeholder="Qty" type="number" className="rounded-xl" />
                    <Input value={item.item_type} onChange={e => updateBulkRow(idx, 'item_type', e.target.value)} placeholder="Type" className="rounded-xl" />
                  </div>
                  <Textarea value={item.description} onChange={e => updateBulkRow(idx, 'description', e.target.value)} placeholder="Description (optional)" rows={2} />
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full rounded-xl" onClick={addBulkRow}>
                <Plus className="w-3 h-3 mr-1" /> Add Another
              </Button>
              <div className="flex gap-2">
                <Button onClick={handleBulkAdd} className="flex-1 rounded-xl">Save Items</Button>
                <Button variant="outline" onClick={() => setShowAdd(false)} className="rounded-xl">Cancel</Button>
              </div>
            </Card>
          )}

          {!showAddCodes ? (
            <Button onClick={() => setShowAddCodes(true)} className="w-full rounded-xl" variant="outline">
              <KeyRound className="w-4 h-4 mr-2" /> Add Recharge Codes
            </Button>
          ) : (
            <Card className="p-4 space-y-3 border-primary/20">
              <h3 className="font-semibold text-sm">Add Codes (one per line)</h3>
              <Textarea value={bulkCodes} onChange={e => setBulkCodes(e.target.value)} placeholder={"1234-5678-9012\n9876-5432-1098\n..."} rows={5} />
              <div className="flex gap-2">
                <Button onClick={handleAddCodes} className="flex-1 rounded-xl">Save Codes</Button>
                <Button variant="outline" onClick={() => setShowAddCodes(false)} className="rounded-xl">Cancel</Button>
              </div>
            </Card>
          )}

          {/* Manage existing codes */}
          {allCodes.length > 0 && (
            <Card className="p-4 space-y-2 border-primary/20">
              <h3 className="font-semibold text-sm">Manage Codes ({allCodes.length})</h3>
              <div className="max-h-60 overflow-y-auto space-y-1">
                {allCodes.map(code => (
                  <div key={code.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg text-xs">
                    {editingCode === code.id ? (
                      <>
                        <Input value={editCodeValue} onChange={e => setEditCodeValue(e.target.value)} className="h-7 text-xs rounded-lg flex-1" />
                        <Button size="sm" className="h-7 text-xs" onClick={() => handleEditCode(code.id)}>Save</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingCode(null)}>✕</Button>
                      </>
                    ) : (
                      <>
                        <span className="font-mono flex-1 truncate">{code.code}</span>
                        <Badge variant={code.is_claimed ? 'secondary' : 'default'} className="text-[10px]">
                          {code.is_claimed ? 'Claimed' : 'Available'}
                        </Badge>
                        <button onClick={() => { setEditingCode(code.id); setEditCodeValue(code.code); }} className="text-muted-foreground hover:text-primary">
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button onClick={() => handleDeleteCode(code.id)} className="text-destructive hover:text-destructive/80">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
