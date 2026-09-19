import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Home, Trash2, Plus, Info, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ImageUpload } from '@/components/ImageUpload';

interface Lodge {
  id: string;
  name: string;
  description: string | null;
  location: string;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
}

// Parse extra images and whatsapp from description
function parseLodgeDescription(desc: string | null) {
  if (!desc) return { text: '', price: '', whatsapp: '', images: [] as string[] };
  const lines = desc.split('\n');
  let price = '';
  let whatsapp = '';
  const images: string[] = [];
  const textLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('💰 Price:')) {
      price = trimmed.replace('💰 Price:', '').trim();
    } else if (trimmed.startsWith('📱 WhatsApp:')) {
      whatsapp = trimmed.replace('📱 WhatsApp:', '').trim();
    } else if (trimmed.startsWith('📷 Inside:') || trimmed.startsWith('📷 Outside:') || trimmed.startsWith('📷 Others:')) {
      const url = trimmed.split(': ').slice(1).join(': ').trim();
      if (url) images.push(url);
    } else if (trimmed) {
      textLines.push(trimmed);
    }
  }

  return { text: textLines.join('\n'), price, whatsapp, images };
}

export function LodgesTab() {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const [lodges, setLodges] = useState<Lodge[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', price: '', location: '', whatsapp: '', image_url: '', image2: '', image3: '', image4: '' });

  useEffect(() => { fetchLodges(); }, []);

  const fetchLodges = async () => {
    const { data } = await supabase.from('food_pantries').select('*').eq('is_active', true).order('created_at', { ascending: false });
    if (data) setLodges(data as Lodge[]);
  };

  const handlePost = async () => {
    if (!user || !form.name.trim() || !form.description.trim() || !form.price.trim() || !form.location.trim()) {
      toast.error('Please fill all required fields');
      return;
    }

    const fullDescription = `💰 Price: ${form.price}\n\n${form.description.trim()}${form.whatsapp ? `\n\n📱 WhatsApp: ${form.whatsapp}` : ''}${form.image2 ? `\n\n📷 Inside: ${form.image2}` : ''}${form.image3 ? `\n\n📷 Outside: ${form.image3}` : ''}${form.image4 ? `\n\n📷 Others: ${form.image4}` : ''}`;

    const { error } = await supabase.from('food_pantries').insert({
      name: form.name.trim(),
      description: fullDescription,
      location: form.location.trim(),
      image_url: form.image_url || null,
      is_active: true,
      created_by: user.id,
    } as any);

    if (error) toast.error('Failed to post lodge');
    else {
      toast.success('Lodge posted!');
      setForm({ name: '', description: '', price: '', location: '', whatsapp: '', image_url: '', image2: '', image3: '', image4: '' });
      setShowAdd(false);
      fetchLodges();
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('food_pantries').delete().eq('id', id);
    toast.success('Lodge removed');
    fetchLodges();
  };

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="w-4 h-4" />
        <AlertDescription>
          Find available lodges nearby. Each listing includes lodge type, description, price, photos, and WhatsApp contact.
        </AlertDescription>
      </Alert>

      {isAdmin && (
        <>
          {!showAdd ? (
            <Button onClick={() => setShowAdd(true)} className="w-full rounded-xl">
              <Plus className="w-4 h-4 mr-2" /> Post Lodge
            </Button>
          ) : (
            <Card className="p-4 space-y-3 border-primary/20">
              <h3 className="font-semibold text-sm">Post a Lodge Listing</h3>
              <div className="space-y-2">
                <Label>Lodge Type / Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Self-contain, 1 Bedroom flat" className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the lodge..." rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Price *</Label>
                  <Input value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="e.g., ₦150,000/yr" className="rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label>Location *</Label>
                  <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g., Behind the main building" className="rounded-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>WhatsApp Business Link</Label>
                <Input value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} placeholder="https://wa.me/234..." className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Photo - Environment</Label>
                <ImageUpload bucket="listings" userId={user?.id || ''} onUpload={(url) => setForm(f => ({ ...f, image_url: url }))} />
              </div>
              <div className="space-y-2">
                <Label>Photo - Inside</Label>
                <ImageUpload bucket="listings" userId={user?.id || ''} onUpload={(url) => setForm(f => ({ ...f, image2: url }))} />
              </div>
              <div className="space-y-2">
                <Label>Photo - Outside</Label>
                <ImageUpload bucket="listings" userId={user?.id || ''} onUpload={(url) => setForm(f => ({ ...f, image3: url }))} />
              </div>
              <div className="space-y-2">
                <Label>Photo - Others</Label>
                <ImageUpload bucket="listings" userId={user?.id || ''} onUpload={(url) => setForm(f => ({ ...f, image4: url }))} />
              </div>
              <div className="flex gap-2">
                <Button onClick={handlePost} className="flex-1 rounded-xl">Post Lodge</Button>
                <Button variant="outline" onClick={() => setShowAdd(false)} className="rounded-xl">Cancel</Button>
              </div>
            </Card>
          )}
        </>
      )}

      {lodges.length === 0 ? (
        <Card className="p-8 text-center">
          <Home className="w-12 h-12 text-primary mx-auto mb-3" />
          <h3 className="font-bold text-lg mb-2 text-foreground">Lodges</h3>
          <p className="text-muted-foreground text-sm">No lodge listings available yet.</p>
        </Card>
      ) : (
        lodges.map(lodge => {
          const parsed = parseLodgeDescription(lodge.description);
          const allPhotos = [
            ...(lodge.image_url ? [lodge.image_url] : []),
            ...parsed.images,
          ];

          return (
            <Card key={lodge.id} className="overflow-hidden">
              {/* Image gallery */}
              {allPhotos.length > 0 && (
                <div className="space-y-1">
                  <img src={allPhotos[0]} alt={lodge.name} className="w-full h-48 object-cover" />
                  {allPhotos.length > 1 && (
                    <div className="flex gap-1 px-1 pb-1">
                      {allPhotos.slice(1).map((url, idx) => (
                        <img key={idx} src={url} alt="" className="flex-1 h-24 object-cover rounded" />
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-foreground text-lg">{lodge.name}</h3>
                    <Badge className="mt-1 text-xs">{lodge.location}</Badge>
                  </div>
                  {isAdmin && (
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(lodge.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                {parsed.price && (
                  <p className="text-primary font-bold mt-2">💰 {parsed.price}</p>
                )}
                {parsed.text && (
                  <p className="text-sm text-muted-foreground mt-2 whitespace-pre-line">{parsed.text}</p>
                )}
                {parsed.whatsapp && (
                  <a href={parsed.whatsapp} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-3 text-sm text-primary font-medium hover:underline">
                    <ExternalLink className="w-4 h-4" /> Contact on WhatsApp
                  </a>
                )}
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
