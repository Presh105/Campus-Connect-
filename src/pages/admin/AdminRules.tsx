import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Trash2, Edit2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

const DISPLAY_LOCATIONS = [
  { id: 'feed', label: 'Feed' },
  { id: 'marketplace', label: 'Marketplace' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'events', label: 'Events' },
  { id: 'predictions', label: 'Predictions' },
  { id: 'chat', label: 'Chat' },
  { id: 'groups', label: 'Groups' },
  { id: 'announcements', label: 'Announcements' },
];

interface Rule {
  id: string;
  title: string;
  content: string;
  is_active: boolean;
  display_locations: string[];
  created_at: string;
}

export default function AdminRules() {
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useAdmin();
  const { user, loading: authLoading } = useAuth();
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [form, setForm] = useState({ title: '', content: '', is_active: true, display_locations: ['feed'] as string[] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
    if (!roleLoading && !isAdmin) {
      navigate('/');
    }
  }, [user, isAdmin, authLoading, roleLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchRules();
    }
  }, [isAdmin]);

  const fetchRules = async () => {
    const { data, error } = await supabase
      .from('pinned_rules')
      .select('id, title, content, is_active, display_locations, created_at')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRules(data.map(r => ({
        ...r,
        display_locations: r.display_locations || ['feed']
      })));
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.title || !form.content) {
      toast.error('Please fill in all fields');
      return;
    }

    setSaving(true);

    if (editingRule) {
      const { error } = await supabase
        .from('pinned_rules')
        .update({
          title: form.title,
          content: form.content,
          is_active: form.is_active,
          display_locations: form.display_locations,
        })
        .eq('id', editingRule.id);

      if (error) {
        toast.error('Failed to update rule');
      } else {
        toast.success('Rule updated');
        fetchRules();
      }
    } else {
      const { error } = await supabase
        .from('pinned_rules')
        .insert({
          title: form.title,
          content: form.content,
          is_active: form.is_active,
          display_locations: form.display_locations,
        });

      if (error) {
        toast.error('Failed to create rule');
      } else {
        toast.success('Rule created');
        fetchRules();
      }
    }

    setSaving(false);
    setIsDialogOpen(false);
    setEditingRule(null);
    setForm({ title: '', content: '', is_active: true, display_locations: ['feed'] });
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('pinned_rules')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete rule');
    } else {
      toast.success('Rule deleted');
      fetchRules();
    }
  };

  const openEditDialog = (rule: Rule) => {
    setEditingRule(rule);
    setForm({ 
      title: rule.title, 
      content: rule.content, 
      is_active: rule.is_active,
      display_locations: rule.display_locations || ['feed']
    });
    setIsDialogOpen(true);
  };

  const toggleLocation = (locationId: string) => {
    setForm(prev => {
      const locations = prev.display_locations.includes(locationId)
        ? prev.display_locations.filter(l => l !== locationId)
        : [...prev.display_locations, locationId];
      return { ...prev, display_locations: locations.length > 0 ? locations : ['feed'] };
    });
  };

  if (authLoading || roleLoading || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        title="Rules & Guidelines" 
        subtitle="Manage pinned rules"
        showBack
        action={
          <Button 
            size="sm" 
            className="rounded-full"
            onClick={() => {
              setEditingRule(null);
              setForm({ title: '', content: '', is_active: true, display_locations: ['feed'] });
              setIsDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Rule
          </Button>
        }
      />

      <div className="px-4 py-4 space-y-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="w-3/4 h-5 bg-muted rounded mb-2" />
                <div className="w-full h-16 bg-muted rounded" />
              </Card>
            ))}
          </div>
        ) : rules.length === 0 ? (
          <Card className="p-8 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No rules yet</h3>
            <p className="text-muted-foreground">Create rules for all users to follow</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => (
              <Card key={rule.id} className={`p-4 shadow-soft ${!rule.is_active ? 'opacity-50' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h3 className="font-semibold">{rule.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{rule.content}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {rule.display_locations.map(loc => (
                        <Badge key={loc} variant="outline" className="text-xs">
                          {DISPLAY_LOCATIONS.find(l => l.id === loc)?.label || loc}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      size="icon" 
                      variant="ghost"
                      onClick={() => openEditDialog(rule)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost"
                      onClick={() => handleDelete(rule.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingRule ? 'Edit Rule' : 'Add Rule'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Rule title"
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  placeholder="Rule content..."
                  value={form.content}
                  onChange={(e) => setForm(prev => ({ ...prev, content: e.target.value }))}
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <Label>Display Locations</Label>
                <p className="text-xs text-muted-foreground">Select where this rule should appear</p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {DISPLAY_LOCATIONS.map(location => (
                    <div key={location.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`loc-${location.id}`}
                        checked={form.display_locations.includes(location.id)}
                        onCheckedChange={() => toggleLocation(location.id)}
                      />
                      <Label htmlFor={`loc-${location.id}`} className="text-sm font-normal">
                        {location.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="active">Active</Label>
                <Switch
                  id="active"
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm(prev => ({ ...prev, is_active: checked }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
