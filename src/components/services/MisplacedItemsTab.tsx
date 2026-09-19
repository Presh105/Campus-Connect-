import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { toast } from 'sonner';
import { Search, MapPin, CheckCircle, AlertTriangle, Eye, ShieldAlert } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ImageUpload } from '@/components/ImageUpload';

interface MisplacedItem {
  id: string;
  user_id: string;
  type: string;
  item_name: string;
  description: string;
  last_seen_location: string | null;
  pickup_location: string | null;
  image_url: string | null;
  is_resolved: boolean;
  contact_info: string | null;
  created_at: string;
}

export function MisplacedItemsTab() {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const [items, setItems] = useState<MisplacedItem[]>([]);
  const [filter, setFilter] = useState<'lost' | 'found'>('lost');
  const [showReport, setShowReport] = useState(false);
  const [reportType, setReportType] = useState<'lost' | 'found'>('lost');
  const [form, setForm] = useState({
    item_name: '', description: '', last_seen_location: '', pickup_location: '', contact_info: '', image_url: ''
  });

  useEffect(() => { fetchItems(); }, [filter]);

  const fetchItems = async () => {
    let query = supabase.from('misplaced_items').select('*').eq('is_resolved', false).order('created_at', { ascending: false });
    query = query.eq('type', filter);
    const { data } = await query;
    if (data) setItems(data);
  };

  const handleReport = async () => {
    if (!user || !form.item_name.trim() || !form.description.trim()) {
      toast.error('Please fill in item name and description');
      return;
    }

    const { error } = await supabase.from('misplaced_items').insert({
      user_id: user.id,
      type: reportType,
      item_name: form.item_name.trim(),
      description: form.description.trim(),
      last_seen_location: form.last_seen_location.trim() || null,
      pickup_location: form.pickup_location.trim() || null,
      contact_info: form.contact_info.trim() || null,
      image_url: form.image_url || null,
    });

    if (error) toast.error('Failed to submit report');
    else {
      toast.success(`${reportType === 'lost' ? 'Lost' : 'Found'} item reported!`);
      setForm({ item_name: '', description: '', last_seen_location: '', pickup_location: '', contact_info: '', image_url: '' });
      setShowReport(false);
      fetchItems();
    }
  };

  const markResolved = async (id: string) => {
    const { error } = await supabase.from('misplaced_items').update({ is_resolved: true }).eq('id', id);
    if (error) toast.error('Failed to update');
    else { toast.success('Marked as resolved'); fetchItems(); }
  };

  // Found items visible ONLY to admin
  const canViewFound = isAdmin;

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'lost' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('lost')}
          className="rounded-full"
        >
          <AlertTriangle className="w-3 h-3 mr-1" /> Lost Items
        </Button>
        {canViewFound && (
          <Button
            variant={filter === 'found' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('found')}
            className="rounded-full"
          >
            <Eye className="w-3 h-3 mr-1" /> Found Items
            <Badge variant="secondary" className="ml-1 text-[10px]">Admin</Badge>
          </Button>
        )}
      </div>

      {filter === 'found' && !canViewFound && (
        <Card className="p-6 text-center">
          <ShieldAlert className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Found items are only visible to administrators for matching purposes.</p>
        </Card>
      )}

      {/* Report Buttons */}
      {!showReport && (
        <div className="flex gap-2">
          <Button className="flex-1 rounded-xl" variant="outline" onClick={() => { setReportType('lost'); setShowReport(true); }}>
            <AlertTriangle className="w-4 h-4 mr-2 text-destructive" /> Report Lost Item
          </Button>
          <Button className="flex-1 rounded-xl" variant="outline" onClick={() => { setReportType('found'); setShowReport(true); }}>
            <Eye className="w-4 h-4 mr-2 text-success" /> Report Found Item
          </Button>
        </div>
      )}

      {/* Report Form */}
      {showReport && (
        <Card className="p-4 space-y-3 border-primary/20">
          <h3 className="font-bold text-foreground">Report {reportType === 'lost' ? 'Lost' : 'Found'} Item</h3>
          <div className="space-y-2">
            <Label>Item Name *</Label>
            <Input value={form.item_name} onChange={e => setForm(p => ({ ...p, item_name: e.target.value }))} className="rounded-xl" placeholder="e.g., Black wallet, Blue notebook" />
          </div>
          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Detailed description of the item..." />
          </div>
          {reportType === 'lost' && (
            <div className="space-y-2">
              <Label>Last Seen Location</Label>
              <Input value={form.last_seen_location} onChange={e => setForm(p => ({ ...p, last_seen_location: e.target.value }))} className="rounded-xl" placeholder="Where did you last see it?" />
            </div>
          )}
          {reportType === 'found' && (
            <div className="space-y-2">
              <Label>Pickup Location</Label>
              <Input value={form.pickup_location} onChange={e => setForm(p => ({ ...p, pickup_location: e.target.value }))} className="rounded-xl" placeholder="Where can the owner pick it up?" />
            </div>
          )}
          <div className="space-y-2">
            <Label>Contact Info</Label>
            <Input value={form.contact_info} onChange={e => setForm(p => ({ ...p, contact_info: e.target.value }))} className="rounded-xl" placeholder="Phone or other contact" />
          </div>
          <div className="space-y-2">
            <Label>Photo (optional)</Label>
            {user && <ImageUpload bucket="posts" userId={user.id} onUpload={url => setForm(p => ({ ...p, image_url: url }))} />}
          </div>
          <div className="flex gap-2">
            <Button onClick={handleReport} className="flex-1 rounded-xl bg-gradient-primary">Submit Report</Button>
            <Button variant="outline" onClick={() => setShowReport(false)} className="rounded-xl">Cancel</Button>
          </div>
        </Card>
      )}

      {/* Items List */}
      {items.length === 0 ? (
        <Card className="p-8 text-center">
          <Search className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No {filter} items reported</p>
        </Card>
      ) : (
        items.map(item => (
          <Card key={item.id} className="p-4">
            <div className="flex items-start gap-3">
              {item.image_url && (
                <img src={item.image_url} alt="" className="w-16 h-16 rounded-lg object-cover" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-foreground">{item.item_name}</h4>
                  <Badge variant={item.type === 'lost' ? 'destructive' : 'default'} className="text-xs">
                    {item.type === 'lost' ? 'Lost' : 'Found'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{item.description}</p>
                {item.last_seen_location && (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <MapPin className="w-3 h-3" /> Last seen: {item.last_seen_location}
                  </p>
                )}
                {item.pickup_location && (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <MapPin className="w-3 h-3" /> Pickup: {item.pickup_location}
                  </p>
                )}
                {item.contact_info && (
                  <p className="text-xs text-primary mt-1">Contact: {item.contact_info}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                </p>
                {(item.user_id === user?.id || isAdmin) && (
                  <Button variant="ghost" size="sm" className="mt-1 text-success" onClick={() => markResolved(item.id)}>
                    <CheckCircle className="w-3 h-3 mr-1" /> Mark Resolved
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
