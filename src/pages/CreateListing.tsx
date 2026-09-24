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
import { Send, DollarSign, Tag, Sparkles, AlertTriangle, ShieldCheck } from 'lucide-react';
import { MARKETPLACE_CATEGORIES } from '@/lib/constants';
import { ImageUpload } from '@/components/ImageUpload';
import { useBanCheck } from '@/hooks/useBanCheck';

export default function CreateListing() {
  const { user, profile } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const { isBanned, loading: banLoading } = useBanCheck('listings');
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');
  const [category, setCategory] = useState('general');
  const [imageUrl, setImageUrl] = useState('');
  const [isSponsored, setIsSponsored] = useState(false);
  const [whatsappLink, setWhatsappLink] = useState('');

  useEffect(() => {
    if (!banLoading && isBanned) {
      toast.error('You are banned from creating listings');
      navigate('/marketplace');
    }
  }, [isBanned, banLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error('Please sign in'); return; }
    if (!title.trim() || !description.trim() || !price.trim()) { toast.error('Please fill in all fields'); return; }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) { toast.error('Please enter a valid price'); return; }

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

    // Point 18: ALL listings need admin approval
    const approvalStatus = isAdmin ? 'approved' : 'pending';

    const { error } = await supabase.from('listings').insert({
      seller_id: user.id,
      title: title.trim(),
      description: description.trim(),
      price: priceNum,
      discount_price: discountPrice ? Number(discountPrice) : null,
      category,
      image_url: imageUrl || null,
      is_sponsored: isSponsored,
      approval_status: approvalStatus as 'pending' | 'approved' | 'rejected',
      whatsapp_link: whatsappLink || null,
    } as any);

    if (error) {
      toast.error('Failed to create listing');
      if (import.meta.env.DEV) console.error(error);
    } else {
      toast.success(isAdmin ? 'Listing created!' : 'Listing submitted for admin approval!');
      navigate('/marketplace');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Sell Something" subtitle="Protected by escrow" showBack />

      <div className="px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Point 18: Admin approval notice */}
          <Alert>
            <ShieldCheck className="w-4 h-4" />
            <AlertDescription>
              All listings require admin approval before going live. Your listing will be reviewed shortly.
            </AlertDescription>
          </Alert>

          <Card className="p-4 shadow-soft">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Product/Service Name</Label>
                <Input id="title" placeholder="What are you selling?" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} className="rounded-xl h-12" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" placeholder="Describe your product or service..." value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} className="rounded-xl min-h-[120px] resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="price">Real Price (₦)</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₦</span>
                    <Input id="price" type="number" placeholder="0.00" value={price} onChange={(e) => setPrice(e.target.value)} className="rounded-xl h-12 pl-9" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discount">Discount Price (₦)</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₦</span>
                    <Input id="discount" type="number" placeholder="optional" value={discountPrice} onChange={(e) => setDiscountPrice(e.target.value)} className="rounded-xl h-12 pl-9" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="rounded-xl h-12"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MARKETPLACE_CATEGORIES.filter(c => c.value !== 'all').map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label>Product Image</Label>
                {user && <ImageUpload bucket="listings" userId={user.id} onUpload={(url) => setImageUrl(url)} />}
              </div>

              {/* Point 16: WhatsApp business link */}
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp Business Link (optional)</Label>
                <Input id="whatsapp" placeholder="https://wa.me/..." value={whatsappLink} onChange={(e) => setWhatsappLink(e.target.value)} className="rounded-xl h-12" />
                <p className="text-xs text-muted-foreground">Buyers can choose between in-app chat or WhatsApp</p>
              </div>

              {/* Sponsored Toggle */}
              <div className="flex items-center justify-between py-3 px-4 bg-warning/10 rounded-xl">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-warning" />
                  <div>
                    <p className="font-medium text-foreground">Sponsored Listing</p>
                    <p className="text-xs text-muted-foreground">{isSponsored ? 'Requires admin approval after payment' : 'Boost visibility (requires payment)'}</p>
                  </div>
                </div>
                <Switch checked={isSponsored} onCheckedChange={setIsSponsored} />
              </div>
            </div>
          </Card>

          {/* Escrow Info */}
          <Card className="p-4 bg-accent/50 border-primary/20">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Tag className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Escrow Protection</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Payments are held securely until the buyer confirms receipt. This protects both parties.
                </p>
              </div>
            </div>
          </Card>

          <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl bg-gradient-primary shadow-primary font-semibold">
            <Send className="w-4 h-4 mr-2" />
            {loading ? 'Creating...' : 'Submit for Approval'}
          </Button>
        </form>
      </div>
    </div>
  );
}
