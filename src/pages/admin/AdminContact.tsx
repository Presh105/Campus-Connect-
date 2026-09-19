import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Save, CreditCard, Globe, FileText } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';

interface ContactItem {
  id: string;
  type: string;
  title: string;
  content: string;
  purpose: string | null;
  duration: string | null;
  is_active: boolean;
  sort_order: number;
}

export default function AdminContact() {
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useAdmin();
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<ContactItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ type: 'payment_account', title: '', content: '', purpose: '', duration: '' });

  // Payment instruction
  const [paymentInstruction, setPaymentInstruction] = useState('');
  const [instructionId, setInstructionId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
    if (!roleLoading && !isAdmin) navigate('/');
  }, [user, isAdmin, authLoading, roleLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchItems();
      fetchPaymentInstruction();
    }
  }, [isAdmin]);

  const fetchItems = async () => {
    const { data } = await supabase.from('contact_info').select('*').order('sort_order', { ascending: true });
    setItems(data || []);
    setLoading(false);
  };

  const fetchPaymentInstruction = async () => {
    const { data } = await supabase.from('app_messages').select('id, content').eq('type', 'payment_instruction').eq('is_active', true).order('created_at', { ascending: false }).limit(1).single();
    if (data) {
      setPaymentInstruction(data.content);
      setInstructionId(data.id);
    }
  };

  const handleAdd = async () => {
    if (!user || !form.title || !form.content) { toast.error('Fill in required fields'); return; }
    setSaving(true);
    const { error } = await supabase.from('contact_info').insert({
      type: form.type, title: form.title, content: form.content,
      purpose: form.purpose || null, duration: form.duration || null,
      updated_by: user.id, sort_order: items.length,
    });
    if (error) toast.error('Failed to add');
    else { toast.success('Added!'); setShowAdd(false); setForm({ type: 'payment_account', title: '', content: '', purpose: '', duration: '' }); fetchItems(); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { error } = await supabase.from('contact_info').delete().eq('id', deleteId);
    if (error) toast.error('Failed to delete');
    else { toast.success('Deleted'); setItems(prev => prev.filter(i => i.id !== deleteId)); }
    setDeleteId(null);
    setDeleting(false);
  };

  const saveInstruction = async () => {
    if (!user) return;
    setSaving(true);
    if (instructionId) {
      await supabase.from('app_messages').update({ content: paymentInstruction }).eq('id', instructionId);
    } else {
      await supabase.from('app_messages').insert({ type: 'payment_instruction', title: 'Payment Instructions', content: paymentInstruction, created_by: user.id });
    }
    toast.success('Payment instructions saved!');
    setSaving(false);
  };

  if (authLoading || roleLoading || !isAdmin) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Contact & Payment" subtitle="Manage payment accounts and links" showBack action={
        <Button size="sm" className="rounded-full" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-1" /> Add</Button>
      } />

      <div className="px-4 py-4 space-y-4">
        {/* Point 28: Payment instructions editor */}
        <Card className="p-4 shadow-soft">
          <h3 className="font-semibold mb-2">Payment Instructions</h3>
          <p className="text-xs text-muted-foreground mb-2">Users must read this before making any payment</p>
          <Textarea value={paymentInstruction} onChange={(e) => setPaymentInstruction(e.target.value)} placeholder="Enter instructions users must read before payment..." className="min-h-[100px]" />
          <Button onClick={saveInstruction} disabled={saving} className="mt-2" size="sm">
            <Save className="w-4 h-4 mr-1" /> Save Instructions
          </Button>
        </Card>

        {/* Contact items */}
        {loading ? (
          <Card className="p-4 animate-pulse"><div className="w-3/4 h-5 bg-muted rounded" /></Card>
        ) : items.length === 0 ? (
          <Card className="p-8 text-center"><p className="text-muted-foreground">No contact info added yet</p></Card>
        ) : (
          items.map(item => (
            <Card key={item.id} className="p-4 shadow-soft">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.content}</p>
                  {item.purpose && <p className="text-xs text-muted-foreground mt-1">Purpose: {item.purpose}</p>}
                  {item.duration && <p className="text-xs text-muted-foreground">Duration: {item.duration}</p>}
                </div>
                <Button variant="ghost" size="icon" onClick={() => setDeleteId(item.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Contact Info</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(val) => setForm(prev => ({ ...prev, type: val }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="payment_account">Payment Account</SelectItem>
                  <SelectItem value="social_link">Social Link</SelectItem>
                  <SelectItem value="instruction">Instruction</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))} placeholder="e.g., Bank Account, Instagram" />
            </div>
            <div className="space-y-2">
              <Label>Content *</Label>
              <Textarea value={form.content} onChange={(e) => setForm(prev => ({ ...prev, content: e.target.value }))} placeholder="Account details, link, or instructions" />
            </div>
            <div className="space-y-2">
              <Label>Purpose (optional)</Label>
              <Input value={form.purpose} onChange={(e) => setForm(prev => ({ ...prev, purpose: e.target.value }))} placeholder="What is this payment for?" />
            </div>
            <div className="space-y-2">
              <Label>Duration (optional)</Label>
              <Input value={form.duration} onChange={(e) => setForm(prev => ({ ...prev, duration: e.target.value }))} placeholder="e.g., Valid until Dec 2026" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving}>{saving ? 'Adding...' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)} onConfirm={handleDelete} title="Delete this item?" description="This will remove this contact info." loading={deleting} />
    </div>
  );
}
